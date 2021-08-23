let playSong = (options = {}) => {

    /*
    if (muted) {
        return;
    }
    */

    let notes = 'AbBCdDeEFgGa';

    let playNote = (node, note, start, bpm = 120, shape = 'square') => {

        if (node.context.state === 'closed') {
            return;
        }

        let noteName = note.replace(/\d/g, '');
        let noteRate = note.match(/^\d+/g);
        noteRate = (noteRate) ? +noteRate[0] : 4;
        let octave = note.match(/\d+$/g);
        octave = (octave) ? +octave[0] : 4;

        let length = 15 / bpm * noteRate;

        let noteIndex = notes.indexOf(noteName);
        if (noteIndex === -1) {
            // a pause in between the notes
            return length;
        }

        let detune = noteIndex * 100 + 1200 * (octave - 4);

        let o = node.context.createOscillator();
        o.connect(node);

        o.frequency.value = 440;
        o.detune.value = detune;
        o.type = shape;

        node.gain.setValueAtTime(0, start);
        node.gain.linearRampToValueAtTime(0.2, start + length * 0.03);
        node.gain.setValueAtTime(0.2, start + length * 0.3);
        node.gain.linearRampToValueAtTime(0, start + length * 1.5);

        o.start(start);
        o.stop(start + length * 1.5);

        return length;
    };

    let {melody, bass, bpm = 240, loop = false} = options;

    let mLooped = !melody;
    let bLooped = !bass;

    let ctx = new AudioContext();

    let biquadFilter = ctx.createBiquadFilter();
    biquadFilter.connect(ctx.destination);
    biquadFilter.type = 'lowpass';
    biquadFilter.frequency.value = 920;
    //biquadFilter.gain.value = 25;

    let musicVolume = ctx.createGain();
    musicVolume.connect(biquadFilter);
    musicVolume.gain.value = 0.5;

    let delayEffect = ctx.createDelay(60 / bpm);
    delayEffect.delayTime.value = 60 / bpm;
    let delayVolume = ctx.createGain();
    delayVolume.gain.value = 0.15;
    delayVolume.connect(musicVolume);
    delayEffect.connect(delayVolume);

    let noteNodes = [0, 1, 2, 3, 4, 5, 6, 7].map(() => {
        let node = ctx.createGain();
        node.connect(musicVolume);
        node.connect(delayEffect);
        return node;
    });

    let index = 0;

    let nextNote = 0;
    let nextNoteTick = 0;

    let nextPluck = 0;
    let nextPluckTick = 0;

    let anticipate = 60 / bpm * 7;

    let stopTime = 0;

    let scheduleNotes = () => {
        if (ctx.state === 'closed') {
            return;
        }
        if (stopTime !== 0 && ctx.currentTime > stopTime) {
            ctx.close();
            return;
        }
        if ((!mLooped && ctx.currentTime > nextNoteTick + 1) || (!bLooped && ctx.currentTime > nextPluckTick + 1)) {
            nextNote = 0;
            nextPluck = 0;
            nextNoteTick = nextPluckTick = ctx.currentTime;
        }
        while (!mLooped && nextNoteTick < ctx.currentTime + anticipate) {
            let noteLength = playNote(noteNodes[index], melody[nextNote], nextNoteTick, bpm, 'sine');
            index = (index + 1) % noteNodes.length;
            nextNote = (nextNote + 1) % melody.length;
            nextNoteTick += noteLength;
            if (nextNote === 0) {
                if (!loop) {
                    mLooped = true;
                }
            }
            stopTime = (stopTime < nextNoteTick + anticipate) ? nextNoteTick + anticipate : stopTime;
        }
        while (!bLooped && nextPluckTick < ctx.currentTime + anticipate) {
            let pluckLength = playNote(noteNodes[index], bass[nextPluck], nextPluckTick, bpm, 'triangle');
            index = (index + 1) % noteNodes.length;
            nextPluck = (nextPluck + 1) % bass.length;
            nextPluckTick += pluckLength;
            if (nextPluck === 0) {
                if (!loop) {
                    bLooped = true;
                }
            }
            stopTime = (stopTime < nextPluckTick + anticipate) ? nextPluckTick + anticipate : stopTime;
        }
        requestAnimationFrame(scheduleNotes);
    };
    scheduleNotes();

    return ctx;
};

export default Object.freeze({
    playSong
});
