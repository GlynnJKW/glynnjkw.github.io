let oauth = document.location.hash;
oauth = oauth.substring(oauth.indexOf("=") + 1, oauth.indexOf("&"))

var DEBUG = false

function debugmsg(str) {
    if(DEBUG) {
        console.log(str);
    }
}
function debugerr(str) {
    if(DEBUG) { 
        console.error(str);
    }
}
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
function SubmitAuth() {
    let opts = {}
    opts.channels = document.getElementById("channels").value;
    opts.emote_channels = document.getElementById("emote_channels").value;
    opts.theme = document.getElementById("dark").checked ? "dark" : "light";
    opts.bttv = document.getElementById("bttv").checked;
    opts.form_done = true;

    let baseURI = `${window.location.href}`;
    let redirURI = AssembleUrl(baseURI, opts);

    window.location.href = redirURI;
    window.location.reload();

}


const clientID = "sufuzgb8tz2jept2wvpm1qhp94iyxe";
const st = "c3ab8aa60vasdf2361f002671";
const default_img_template = "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}";

let params = new URLSearchParams(document.location.href)

var conchans = [];
var emotechans = [];

var emote_scale = "1.0"; 
var bttv_scale = "1x";

var emoteSets = {};
var emotes = {};

var badges = {};
var even = true;

var bttvEmotes = {};
const default_bttv_template = "https://cdn.betterttv.net/emote/{{id}}/{{scale}}";

if(!oauth) {
    //Don't display options form until after authentication
    let form = document.getElementById("options");
    form.remove();    
}
else {
    //function to get global or channel emotes
    async function getChannelEmotes(obj, channel) {
        let endpoint = '';

        if(channel){
            endpoint = `https://api.twitch.tv/helix/users?login=${channel.substring(1)}`; //remove # from start
            let response = await window.fetch(endpoint, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${oauth}`,
                        'Client-ID': clientID
                    }
                });
            let json = await response.json();
            if(!json.data.length) {
                debugerr("Channel " + channel + " does not exist");
                return;
            }
            let userid = json.data[0].id;
    
            endpoint = `https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${userid}`;    
        }
        else {
            endpoint = 'https://api.twitch.tv/helix/chat/emotes/global';
        }

        response = await window.fetch(endpoint, 
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${oauth}`,
                    'Client-ID': clientID
                }
            });
        json = await response.json();
        let setids = new Set();
        for(let emote of json.data){
            obj[emote.id] = emote;
            setids.add(emote.emote_set_id);
        }

        for(let setid of setids){
            emoteSets[setid] = default_img_template;
        }
    }

    //function to get emotes from emote set
    async function getEmotes(obj, setid) {
        let endpoint = ""
        if(!setid){
            return;
        }
        else{
            endpoint = `https://api.twitch.tv/helix/chat/emotes/set?emote_set_id=${setid}`
        }
        let response = await window.fetch(endpoint, 
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${oauth}`,
                    'Client-ID': clientID
                }
            });
        let json = await response.json();
        for(emote of json.data){
            obj[emote.id] = emote;
        }
        if(setid){
            emoteSets[setid] = json.template;
        }
        else {
            emoteSets.global = json.template;
        }
    }

    //function to get global or channel badges
    async function getChannelBadges(obj, channel) {
        let endpoint = '';

        if(channel){
            endpoint = `https://api.twitch.tv/helix/users?login=${channel.substring(1)}`;
            let response = await window.fetch(endpoint, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${oauth}`,
                        'Client-ID': clientID
                    }
                });
            let json = await response.json();
            if(!json.data.length) {
                debugerr("Channel " + channel + " does not exist");
                return;
            }
            let userid = json.data[0].id;
    
            endpoint = `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${userid}`;    
        }
        else {
            endpoint = 'https://api.twitch.tv/helix/chat/badges/global';
        }

        response = await window.fetch(endpoint, 
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${oauth}`,
                    'Client-ID': clientID
                }
            });
        json = await response.json();
        
        if(!channel) {
            channel = "global";
        }
        obj[channel] = {};
        if(json.data.length){
            let cb = obj[channel];
            for(let badge_set of json.data){
                //create new badge set if doesnt exist
                cb[badge_set.set_id] = {}
                for(let badgev of badge_set.versions) {
                    let b = {'1.0': badgev.image_url_1x, '2.0': badgev.image_url_2x, '3.0': badgev.image_url_4x};
                    cb[badge_set.set_id][badgev.id] = b;
                }
            }
        }
    }

    async function getChannelBttvEmotes(obj, channel) {
        let endpoint = '';

        if(channel){
            endpoint = `https://api.twitch.tv/helix/users?login=${channel.substring(1)}`; //remove # from start
            let response = await window.fetch(endpoint, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${oauth}`,
                        'Client-ID': clientID
                    }
                });
            let json = await response.json();
            if(!json.data.length) {
                debugerr("Channel " + channel + " does not exist");
                return;
            }
            let userid = json.data[0].id;
    
            endpoint = `https://api.betterttv.net/3/cached/users/twitch/${userid}`;    
        }
        else {
            endpoint = 'https://api.betterttv.net/3/cached/emotes/global';
        }

        response = await window.fetch(endpoint, 
            {
                method: 'GET'
            });
        json = await response.json();
        if(channel) {
            for(let emote of json.channelEmotes) {
                obj[emote.code] = emote.id;
            }
            for(let emote of json.sharedEmotes) {
                obj[emote.code] = emote.id;
            }
        }
        else {
            for(let emote of json) {
                obj[emote.code] = emote.id;
            }
        }
    }

    //remove grant access button
    let link = document.getElementById("accesslink");
    link.remove();
    let form_done = params.get("form_done");
    if(form_done) {
        let form = document.getElementById("options");
        form.remove();

        //Fill channels
        let param_chans = params.get("channels");
        param_chans = param_chans.split(",");
        for(let chan of param_chans) {
            if(chan.trim()) {
                conchans.push(chan.trim());
            }
        }
        console.log("Connected Channels", conchans);

        //Fill emote channels
        let param_echans = params.get("emote_channels");
        param_echans = param_echans.split(",");
        for(let echan of param_echans) {
            if(echan.trim()) {
                emotechans.push(echan.trim());
            }
        }
        console.log("Emote Channels", emotechans);

        var bttv = params.get("bttv");

        //Fill theme
        var emote_theme = params.get("theme");
        if(emote_theme == "dark") {
            let link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = "/chatmixer/dark.css";
            document.head.appendChild(link);
        }
    }

    //create client
    let state = params.get("state");
    if(state != st) {
        throw new Error("States do not match, authentication failed");
    }
    var client = new tmi.client({
        options: { debug: false },
        connection: {
            reconnect: true
        },
        identity: {
            username: 'chatmixer',
            password: oauth
        },
        channels: conchans
    });

    //Get global emotes and channel emotes
    getChannelEmotes(emotes);
    getChannelBadges(badges);
    for(let chan of conchans) {
        getChannelEmotes(emotes, chan);
        getChannelBadges(badges, chan);
    }

    if(bttv) {
        getChannelBttvEmotes(bttvEmotes);
        for(let chan of conchans) {
            getChannelBttvEmotes(bttvEmotes, chan);
        }
    }

    client.on('message', (channel, tags, message, self) => {
        if(self) return;
        let finalmsg = message
        //replace message text with emote tags
        if(tags.emotes) {
            for(emote in tags.emotes) { //iterate through unique emotes in message
                if(emote in emotes) { //if we have emote set available
                    let repstr = emoteSets[emotes[emote].emote_set_id]; //default format string
                    let animated = emotes[emote].format.includes("animated"); //check if emote animated
                    if(animated){
                        repstr = repstr.replace("{{format}}", "animated");
                    }
                    else{
                        repstr = repstr.replace("{{format}}", "static");
                    }
                    repstr = repstr.replace("{{id}}", emote).replace("{{theme_mode}}", emote_theme).replace("{{scale}}", emote_scale)
                    repstr = `<img class="emote" src="${repstr}">`; //final formatted emote string as <img> tag

                    let repname = emotes[emote].name;
                    finalmsg = finalmsg.replaceAll(repname, repstr); //replace all occurences of emote with tag

                }
                else{ //emote set not available
                    debugmsg(`emote ${emote} not in loaded emote sets, using default.`)
                    let repstr = default_img_template;
                    //TODO: Check for animated
                    repstr = repstr.replace("{{format}}", "static").replace("{{id}}", emote).replace("{{theme_mode}}", emote_theme).replace("{{scale}}", emote_scale);
                    repstr = `<img class="emote" src="${repstr}">`; //final formatted emote string as <img> tag
                    let foc = tags.emotes[emote][0];
                    let fs = parseInt(foc.substring(0, foc.indexOf('-')));
                    let fe = parseInt(foc.substring(foc.indexOf('-') + 1));
                    let repname = message.substring(fs, fe + 1);
                    finalmsg = finalmsg.replaceAll(repname, repstr); //replace all occurences of emote with tag
                }
            }
        }

        //bttv emotes
        for(let bemote in bttvEmotes) {
            if(finalmsg.indexOf(bemote) == -1) {
                continue;
            }
            let repname = bemote;
            let repstr = default_bttv_template;
            repstr = repstr.replace("{{id}}", bttvEmotes[bemote]).replace("{{scale}}", bttv_scale);
            repstr = `<img class="emote" src="${repstr}">`; //final formatted emote string as <img> tag
            //console.log(message, repname, repstr);
            finalmsg = finalmsg.replaceAll(repname, repstr);
        }

        //add user badges
        let badgetags = "";
        if(tags.badges) {
            for(let badge in tags.badges) {
                //Check channel for badge version
                if(badge in badges[channel]) {
                    let ver = tags.badges[badge];
                    if(ver in badges[channel][badge]) {
                        badgetags += `<img class="badge" src="${badges[channel][badge][ver][emote_scale]}">`; //add badge and continue
                    }
                }
                //Check global for badge version
                else if(badge in badges.global) {
                    let ver = tags.badges[badge];
                    if(ver in badges.global[badge]) {
                        badgetags += `<img class="badge" src="${badges.global[badge][ver][emote_scale]}">`; //add badge and continue
                    }
                }
                //Failure
                else {
                    debugerr("Could not find badge set " + badge);
                }
            }
            
        }

        //Add username
        let user = `<p style="color:${tags.color}">${tags.username}</p>`;

        let chat = document.getElementById("chat");
        let msg = document.createElement("li");
        let classes = ""
        //every other message will be either even or odd
        if(even){
            classes += "even ";
        }
        else{
            classes += "odd ";
        }
        //tag message with channel name
        classes += channel.substring(1);
        //tag message with channel index
        classes += ` channel${conchans.indexOf(channel)}`;
        msg.classList = classes;
        even = !even;
        msg.innerHTML = `${badgetags} ${user}:  <p class="msg">${finalmsg}</p>`;
        chat.appendChild(msg);

        //check for overflow, delete old chat message(s) if overflow
        let container = document.getElementById("container");
        while(container.scrollHeight + 5 >= window.innerHeight) {
            let earliestmsg = chat.children[0];
            //prevent colors from swapping by adding dummy element or removing dummy element
            earliestmsg.remove();
        }
    });



    //Update loaded emote sets
    client.on('emotesets', (sets) => {
        debugmsg("EMOTE SETS: " + sets);
        setarr = sets.split(',');
        for(set of setarr) {
            if(!(set in emoteSets)) {
                getEmotes(emotes, set);    
            }
        }
    });
    

    client.connect().catch(console.error);

}
