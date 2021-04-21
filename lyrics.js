
class TimeTagedText
{
    constructor(text)
    {
        let mat = text.match(/^\[(\d+):(\d+)[:.](\d+)\](.*)$/);
        if (mat)
        {
            this.text = mat[4];
            this.starttime = mat[1] * 60000 + mat[2] * 1000 + mat[3] * 10;
        }
        else
        {
            this.text = "";
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
            let word = new TimeTagedText(line);
            if (word.starttime >= 0)
            {
                this.lines.push(word);
            }
        });
        this.lines.push(new TimeTagedText("[99:59.99]"));
    }
}

class KaraokeLine
{
    constructor(textline,nexttime)
    {
        this.words = [];
        let linehead = textline.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
        if (linehead)
        {
            this.starttime = linehead[1] * 60000 + linehead[2] * 1000 + linehead[3] * 10;
            let ttts = textline.match(/\[\d+:\d+[:.]\d+\][^\[]]*/g);
            ttts.forEach(ttt => {
                this.words.push(new TimeTagedText(ttt));
            });

            for (let i = 0; i < this.words.length - 1;i++)
            {
                this.words[i].endtime = this.words[i+1].starttime;
            }
            this.words[this.words.length-1].endtime = nexttime;
        }
        else
        {
            this.starttime = -1;
        }
    }
}

class KaraokeContainer
{
    constructor(karaoketext)
    {
        this.lines = [];
        let lines = [];
        karaoketext.split(/\r\n|\r|\n/).array.forEach(line => {

            let linehead = line.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
            if (linehead)
            {
                lines.push(line);
            }
        });
        lines.push("[99:59.99]");

        for (let i = 0;i< lines.length - 1;i++)
        {
            let nextttt = new TimeTagedText(lines[i+1]);
            this.lines.push(new KaraokeLine(line,nextttt.starttime));
        }
    }

}
