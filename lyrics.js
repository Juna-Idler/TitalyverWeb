
class TimeTagElement
{
    static Create(text)
    {
        let match = text.match(/^\[(\d+):(\d+)[:.](\d+)\](.*)$/);
        if (match)
        {
            const second = parseFloat(match[2] + '.' + match[3]);
            const this_starttime = (match[1] * 60000 + second * 1000).toFixed();
            return new TimeTagElement(this_starttime,match[4]);
        }
        return new TimeTagElement(-1,text);
    }
    constructor(starttime,text)
    {
        this.text = text;
        this.starttime = starttime;
    }
}
class LyricsContainer
{
    constructor(lyticstext)
    {
        this.lines = [];
        lyticstext.split(/\r\n|\r|\n/).forEach(line => {
            let word = TimeTagElement.Create(line);
            if (word.starttime >= 0)
            {
                this.lines.push(word);
            }
        });
        this.lines.push(TimeTagElement.Create("[99:59.99]"));
    }
}


class KaraokeUnit
{
    static Create(text,endtime = -1)
    {
        let this_elements = [];
        let this_endtime;
        let head = text.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
        if (head)
        {
            const ttelements = text.match(/\[\d+:\d+[:.]\d+\][^\[\]]*/g);
            ttelements.forEach(tte => {
                this_elements.push(TimeTagElement.Create(tte));
            });
        }
        else
        {
            const tmp = "[00:00.00]" + text;
            const ttelements = tmp.match(/\[\d+:\d+[:.]\d+\][^\[\]]*/g);
            ttelements.forEach(tte => {
                this_elements.push(TimeTagElement.Create(tte));
            });
            this_elements[0].starttime = -1;
        }
        if (this_elements.length > 1 && this_elements[this_elements.length-1].text == "")
        {
            const lasttime = this_elements[this_elements.length-1].starttime;
            this_endtime = Math.max(lasttime,endtime); 
        }
        else
            this_endtime = endtime;

        return new KaraokeUnit(this_elements,this_endtime);
    }
    constructor(elements,endtime)
    {
        this.elements = elements;
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

    DivideRear(text_index)
    {
        if (text_index == 0)
        {
            const divide = new KaraokeUnit(this.elements,this.endtime);
            this.elements = [];
            this.elements.push(new TimeTagElement(this.elements[0].starttime,""));
            this.endtime = this.elements[0].starttime;
            return divide;
        }
        let text_distance = 0;
        for (let i = 0; i < this.elements.length;i++)
        {
            if (text_index < text_distance + this.elements[i].text.length)
            {
                if (text_index == text_distance)
                {
                    const parts = this.elements.splice(i);
                    const divide = new KaraokeUnit(parts,this.endtime);
                    this.endtime = parts[0].starttime;
                    return divide;
                }
                const pt = this.elements[i].starttime;
                const nt = (i + 1 != this.elements.length) ? this.elements[i + 1].starttime : this.endtime;
                const pc = text_index - text_distance;
                const nc = this.string.length - pc; 
                const divtime = (pt * nc + nt * pc) / (pc + nt);

                const parts = this.elements.splice(i);
                this.elements.push(new TimeTagElement(parts[0].starttime,
                                                      parts[0].text.substring(0,text_index - text_distance)));

                parts[0].text = parts[0].text.substring(text_index - text_distance);
                parts[0].starttime = divtime;
                const divide = new KaraokeUnit(parts, this.endtime);
                this.endtime = divtime;

                return divide;
            }
            text_distance += this.elements[i].text.length;
        }
        return new KaraokeUnit([new TimeTagElement(this.endtime,"")],this.endtime);
    }

    DivideFront(text_index)
    {
        if (text_index == 0)
        {
            return new KaraokeUnit([].push(new TimeTagElement(this.starttime,"")),this.starttime);
        }
        let text_distance = 0;
        for (let i = 0; i < this.elements.length;i++)
        {
            if (text_index < text_distance + this.elements[i].text.length)
            {
                if (text_index == text_distance)
                {
                    const parts = this.elements.splice(i);
                    const divide = new KaraokeUnit(this.element,parts[0].starttime);
                    this.elements = parts;
                    return divide;
                }
                const pt = this.elements[i].starttime;
                const nt = (i + 1 != this.elements.length) ? this.elements[i + 1].starttime : this.endtime;
                const pc = text_index - text_distance;
                const nc = this.elements.length - pc; 
                const divtime = (pt * nc + nt * pc) / (pc + nt);

                const parts = this.elements.splice(i);
                this.elements.push(new TimeTagElement(parts[0].starttime,
                                                      parts[0].text.substring(0,text_index - text_distance)));

                parts[0].text = parts[0].text.substring(text_index - text_distance);
                parts[0].starttime = divtime;
                const divide = new KaraokeUnit(this.element,divtime);
                this.elements = parts;

                return divide;
            }
        }
        const divide = new KaraokeUnit(this.elements,this.endtime);
        this.elements = [];
        this.elements.push(new TimeTagElement(this.endtime,""));
        return divide;
    }

    ConnectRear(unit)
    {
        this.elements.push(...unit.elements);
        this.endtime = unit.endtime;
    }
    ConnectFront(unit)
    {
        this.elements.unshift(...unit.elements);
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
                this.lines.push(KaraokeUnit.Create(line));
            }
        });
        this.lines.push(KaraokeUnit.Create("[99:59.99]"));

        for (let i = 0;i< this.lines.length - 1;i++)
        {
            if (this.lines[i].endtime < this.lines[i+1].starttime)
                this.lines[i].endtime = this.lines[i+1].starttime;
        }
    }

}


