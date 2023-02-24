let eleven_key,minimum_bits,default_voice;
const cheer_regex = /[cC]heer[0-9]+/g;

let voices = [];
let voice_queue = [];
let queue_running = false;
let audio_player = null;

const banned_words = [
    /\bnigger(s*)\b/g,
    /\bniger(s*)\b/g,
    /\bfaggot(s*)\b/g,
    /\bfagot(s*)\b/g,
    /\btranny(s*)\b/g,
    /\btrany(s*)\b/g,
    /\bgook(s*)\b/g,
    /\bchink(s*)\b/g
];

function RemoveBadWords(msg) {
    for(word of banned_words) {
        msg = msg.replaceAll(word, " ");
    }
    return msg;
}

async function GetVoices(api_key){
    let voices = []
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': api_key
        },
        redirect: 'follow'
    });
    let json = await response.json()
    for(let v of json["voices"]) {
        if(v.category != "premade") {
            voices.push(v);
        }
    }
    return voices;
}

//Returns ArrayBuffer for playing
async function VoiceRequest(api_key, voice_id, message){
    let data = {
        "text": message
    };
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': api_key
        },
        redirect: 'follow',
        body: JSON.stringify(data)
    });
    let buf = await response.arrayBuffer();
    return buf;
    //console.log(json)
}

async function DummyRequest(){
    const response = await fetch("../biden_balls.mp3");
    let buf = await response.arrayBuffer();
    return buf;
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function PlayAudio(player, context) {
    player.connect(context.destination);
    player.start(context.currentTime);
    context.resume();
    let finished = false
    player.onended = () => {
        finished = true;
    }
    audio_player = player;
    while(!finished) {
        await delay(10);
    }
}

async function PlayMessage(api_key, message, voices){
    if(default_voice != null && default_voice != "") {
        if(voices.find(v => v.name.toLowerCase() == default_voice.toLowerCase())) {

        }
        else {
            default_voice = "Chief";
        }
    }
    else {
        default_voice = "Chief";
    }

    let message_chunks = [{"name": default_voice, "text": message}];
    for(voice of voices) {
        let next_chunks = [];
        for(message of message_chunks) {
            let msgs = message.text.split(voice.name + ":")
            if(msgs[0].trim() != "") {
                next_chunks.push({"name": message.name, "text": msgs[0].trim()});
            }
            for(let i = 1; i < msgs.length; ++i){
                if(msgs[i].trim() != "") {
                    next_chunks.push({"name": voice.name, "text": msgs[i].trim()});
                }
            }
        }
        message_chunks = next_chunks;
    }
    console.log(message_chunks);

    let c = new AudioContext();

    let reqs = []
    for(let chunk of message_chunks) {
        let voice = voices.find(v => v.name.toLowerCase() == chunk.name.toLowerCase());
        if(voice) {
            reqs.push(VoiceRequest(api_key, voice.voice_id, chunk.text));
        }
    }

    let buffers = await Promise.all(reqs);
    let decodes = []
    for(let buffer of buffers) {
        decodes.push(c.decodeAudioData(buffer));
    }

    let lines = await Promise.all(decodes);
    for(let line of lines) {
        let player = c.createBufferSource();
        player.buffer = line;
        await PlayAudio(player, c);
    }
}

async function DummyMessage(){
    let c = new AudioContext();
    let buf = await DummyRequest();
    let decode = await c.decodeAudioData(buf);
    let player = c.createBufferSource();
    player.buffer = decode;
    await PlayAudio(player, c);
}

async function IterateQueue(){
    while(voice_queue.length > 0) {
        let q = voice_queue.shift();
        await PlayMessage(q.key, q.msg, q.voices);
        //await DummyMessage();
    }
    queue_running = false;
}

function QueueMessage(api_key, message, voices){
    voice_queue.push({"key": api_key, "msg": message, "voices": voices});
    if(!queue_running) {
        queue_running = true;
        IterateQueue();
    }
}

window.addEventListener('onWidgetLoad', function (obj) {
    const fieldData = obj.detail.fieldData;
    eleven_key=fieldData["eleven_key"];
    minimum_bits=fieldData["minimum_bits"];
    default_voice=fieldData["default_voice"];
    GetVoices(eleven_key).then(v => voices = v).catch(err => console.error(err));
});

window.addEventListener('onEventReceived', function (obj) {
    // fancy stuff here
    if(obj.detail.listener == 'cheer-latest' && obj.detail.event.amount >= minimum_bits) {
        msg = obj.detail.event.message.replaceAll(cheer_regex, "");
        msg = RemoveBadWords(msg);
        console.log(msg);
        QueueMessage(eleven_key, msg, voices);
    }
    // if(obj.detail.listener == 'subscriber-latest') {
    //     msg = obj.detail.event.message.replaceAll(cheer_regex, "");
    //     msg = RemoveBadWords(msg);
    //     console.log(msg);
    //     QueueMessage(eleven_key, msg, voices);
    // }
    // if(obj.detail.listener == 'tip-latest') {
    //     msg = obj.detail.event.message.replaceAll(cheer_regex, "");
    //     msg = RemoveBadWords(msg);
    //     console.log(msg);
    //     QueueMessage(eleven_key, msg, voices);
    // }
});