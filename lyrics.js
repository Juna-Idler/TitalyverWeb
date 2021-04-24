
class TimeTagElement
{
    constructor(text)
    {
        let match = text.match(/^\[(\d+):(\d+)[:.](\d+)\](.*)$/);
        if (match)
        {
            this.text = match[4];
            this.starttime = match[1] * 60000 + match[2] * 1000 + match[3] * 10;
        }
        else
        {
            this.text = text;
            this.starttime = -1;
        }
    }
}
class TimeTagSet
{
    constructor(text)
    {
        this.elements = [];
        let head = text.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
        if (head)
        {
            let ttelements = text.match(/\[\d+:\d+[:.]\d+\][^\[\]]*/g);
            ttelements.forEach(tte => {
                this.elements.push(new TimeTagElement(tte));
            });
        }
        else
        {
            this.elements.push(new TimeTagElement(text));
        }
    }
    get string()
    {
        let ret = "";
        this.elements.forEach(e =>{ret += e.text;});
        return ret;
    }
}

class LyricsContainer
{
    constructor(lyticstext)
    {
        this.lines = [];
        lyticstext.split(/\r\n|\r|\n/).forEach(line => {
            let word = new TimeTagElement(line);
            if (word.starttime >= 0)
            {
                this.lines.push(word);
            }
        });
        this.lines.push(new TimeTagElement("[99:59.99]"));
    }
}


class KaraokeContainer
{
    constructor(karaoketext)
    {
        this.lines = [];
        let lines = [];
        karaoketext.split(/\r\n|\r|\n/).forEach(line => {

            let linehead = line.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
            if (linehead)
            {
                lines.push(line);
            }
        });
        lines.push("[99:59.99]");

        let tts = new TimeTagSet(lines[0]);
        tts.starttime = tts.elements[0].starttime;
        for (let i = 0;i< lines.length - 1;i++)
        {
            let nexttts = new TimeTagSet(lines[i+1]);
            nexttts.starttime = nexttts.elements[0].starttime;
            const lasttime = tts.elements[tts.elements.length-1].starttime;
            tts.endtime = nexttts.starttime > lasttime ? nexttts.starttime : lasttime;
            this.lines.push(tts);
            tts = nexttts;
        }
    }

}


