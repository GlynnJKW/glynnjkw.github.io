let params = new URLSearchParams(document.location.href);
const cheer_regex = /[cC]heer[0-9]+/g;

function UrlExists(url) {
    var http = new XMLHttpRequest();
        http.open('OPTIONS', url, false);
        http.send();
        if (http.status != 404)
            return true;
        else
            return false;
}
function AssembleUrl(base, options) {
    let uri = `${base}`;
    for (let option in options) {
        uri += `&${encodeURIComponent(option)}=${encodeURIComponent(options[option])}`;
    }
    return uri;
}

if(params.get("form_done")) {
    let form = document.getElementById("options");
    form.remove();

    let bit_threshold = params.get("minimum_bits");
    if(!bit_threshold || bit_threshold == ""){
        bit_threshold = 0;
    }
    else{
        bit_threshold = +bit_threshold
    }

    let eleven_key = params.get("eleven_key");

    let voices = [];
    GetVoices(eleven_key).then(v => voices = v).catch(err => console.error(err));

    console.log("asdf");
    if(params.get("source") == "StreamLabs") {
        //Connect to socket
        const streamlabs = io(`https://sockets.streamlabs.com?token=${params.get("api_key")}`);
        console.log("asdf2");
        //Perform Action on event
        streamlabs.on('event', (eventData) => {
            //console.log(eventData);
            if (eventData.for === 'twitch_account') {
                switch(eventData.type){
                    case "bits":
                        if((eventData.message[0].amount < bit_threshold)){

                        }
                        else{
                            msg = eventData.message[0].message.replaceAll(cheer_regex, "");
                            msg = RemoveBadWords(msg);
                            console.log(msg);
                            QueueMessage(eleven_key, msg, voices);
                        }
                        break;
                    default:
                        break;
                }
            }
        });
    }
    else { // StreamElements
        const jwt = params.get("api_key");
        const streamelements = io('https://realtime.streamelements.com', {
            transports: ['websocket']
        });

        streamelements.on('connect', () => {
            console.log("Connected to streamelements, authenticating with jwt");
            streamelements.emit('authenticate', {method: 'jwt', token: jwt});
        });

        streamelements.on('disconnect', () => {
            console.log("Disconnected from streamelements");
            streamelements.socket.connect();
        });

        streamelements.on('authenticated', (data) => {
            const {
                channelId
            } = data;
            console.log(`Successfully connected to channel ${channelId}`);
        });

        window.streamelements = streamelements;
        console.log("asdf2");

        streamelements.on('event', (data) => {
            // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
            console.log(data);
            if(data.listener == "cheer-latest" && data.event.amount >= bit_threshold) {
                msg = data.event.message.replaceAll(cheer_regex, "");
                msg = RemoveBadWords(msg);
                console.log(msg);
                QueueMessage(eleven_key, msg, voices);
            }
        });
        streamelements.on('event:test', (data) => {
            // Structure as on https://github.com/StreamElements/widgets/blob/master/CustomCode.md#on-event
            //console.log(data);
            if(data.listener == "cheer-latest" && data.event.amount >= bit_threshold) {
                msg = data.event.message.replaceAll(cheer_regex, "");
                msg = RemoveBadWords(msg);
                console.log(msg);
                QueueMessage(eleven_key, msg, voices);
            }
        });
    }
}
