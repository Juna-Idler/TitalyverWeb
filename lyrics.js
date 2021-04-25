
class TimeTagElement
{
    constructor(text)
    {
        let match = text.match(/^\[(\d+):(\d+)[:.](\d+)\](.*)$/);
        if (match)
        {
            this.text = match[4];
            let second = parseFloat(match[2] + '.' + match[3]);
            this.starttime = (match[1] * 60000 + second * 1000).toFixed();
        }
        else
        {
            this.text = text;
            this.starttime = -1;
        }
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


class KaraokeUnit
{
    constructor(text,endtime= -1)
    {
        this.elements = [];
        let head = text.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
        if (head)
        {
            const ttelements = text.match(/\[\d+:\d+[:.]\d+\][^\[\]]*/g);
            ttelements.forEach(tte => {
                this.elements.push(new TimeTagElement(tte));
            });
        }
        else
        {
            const tmp = "[00:00.00]" + text;
            const ttelements = tmp.match(/\[\d+:\d+[:.]\d+\][^\[\]]*/g);
            ttelements.forEach(tte => {
                this.elements.push(new TimeTagElement(tte));
            });
            this.elements[0].starttime = -1;
        }
        if (this.elements.length > 1 && this.elements[this.elements.length-1].text == "")
        {
            const lasttime = this.elements[this.elements.length-1].starttime;
            this.endtime = Math.max(lasttime,endtime); 
        }
        else
            this.endtime = endtime;
    }
    get starttime()
    {
        return this.elements[0].starttime;
    }
    set starttime(value)
    {
        this.elements[0].starttime = value;
    }
    get string()
    {
        let ret = "";
        this.elements.forEach(e =>{ret += e.text;});
        return ret;
    }
}


class KaraokeContainer
{
    constructor(karaoketext)
    {
        this.lines = [];
        karaoketext.split(/\r\n|\r|\n/).forEach(line => {

            let linehead = line.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
            if (linehead)
            {
                this.lines.push(new KaraokeUnit(line));
            }
        });
        this.lines.push(new KaraokeUnit("[99:59.99]"));

        for (let i = 0;i< this.lines.length - 1;i++)
        {
            if (this.lines[i].endtime < this.lines[i+1].starttime)
                this.lines[i].endtime = this.lines[i+1].starttime;
        }
    }

}


