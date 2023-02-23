//Returns list of voices (names, ids)
// {
//     "voices": [
//       {
//         "voice_id": "21m00Tcm4TlvDq8ikWAM",
//         "name": "Rachel",
//         "samples": [],
//         "category": "premade",
//         "labels": {},
//         "preview_url": "https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/6edb9076-c3e4-420c-b6ab-11d43fe341c8.mp3",
//         "available_for_tiers": [],
//         "settings": null
//       },

let voice_queue = [];
let queue_running = false;
let audio_player = null;

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
    let message_chunks = [{"name": "chief", "text": message}];
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