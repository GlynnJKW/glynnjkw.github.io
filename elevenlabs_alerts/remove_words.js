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