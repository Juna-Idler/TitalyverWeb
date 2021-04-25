
//ルビ付き（かもしれない）文字
class RubyUnit
{
    constructor(base,ruby = null)
    {
        this.base = base;
        this.ruby = ruby;
    }
    get hasRuby() {return this.ruby != null;}
    get noRuby() {return this.ruby == null;}
}

//ルビを振るための指定文字 RubyUnit(target.substring(offset,offset + length),ruby)
class RubyingWord
{
    constructor( target , ruby , offset = 0 , length = -1 )
    {
        this.target = target;
        this.ruby = ruby;
        this.parent_offset = offset;
        this.parent_length = length >= 0 ? length : target.length - offset;
    }
    
}

//ルビ指定のためのテキスト内の@行処理
class AtRubyTag
{
    constructor(parent = "｜" ,begin = "《" ,end = "》")
    {
        this.ruby_parent = parent;
        this.ruby_begin = begin;
        this.ruby_end = end;

        this.rubying = [];
    }
    LoadAtRubyTag(lyricstext)
    {
        this.lines = [];
        lyricstext.split(/\r\n|\r|\n/).forEach(line => {
            const at = line.match(/^@([^=]+)=(.*)/);
            if (at)
            {
                const name = at[1].toLowerCase(),value = at[2];
                if (name == "ruby")
                {
                    const rat = value.match(/^\[([^\]]+)\]((\d+),(\d+))?\[([^\]]+)\]$/);
                    if (rat)
                    {
                        this.rubying.push(new RubyingWord(rat[1],rat[5],rat[3],rat[4]));
                    }
                }
                else if (name == "ruby_parent")
                {
                    this.ruby_parent = value;
                }
                else if (name == "ruby_begin")
                {
                    this.ruby_begin = value;
                }
                else if (name == "ruby_end")
                {
                    this.ruby_end = value;
                }
            }
        });

    }

    AtRubying(text)
    {
        let targets = [];
        targets.push(new RubyUnit(text));
        this.rubying.forEach(rubying =>
        {
            for (let i = 0;i < targets.length;i++)
            {
                if (targets[i].hasRuby)
                    continue;

                const target = targets[i].word;
                const index = target.indexOf(rubying.target);
                if (index >= 0)
                {
                    const div1 = index + rubying.parent_offset;
                    const div2 = index + rubying.parent_offset + rubying.parent_length;

                    if (div1 > 0 && div2 < target.length)
                    {
                        targets.splice(i,1,new RubyUnit(target.substring(0,div1)),
                                           new RubyUnit(target.substring(div1,div2),rubying.ruby),
                                           new RubyUnit(target.substring(div2)));
                        i++;
                    }
                    else if (div1 == 0 && div2 < target.length)
                    {
                        targets.splice(i,1,new RubyUnit(target.substring(0,div2),rubying.ruby),
                                           new RubyUnit(target.substring(div2)));

                   }               
                   else if (div1 > 0 && div2 == target.length)
                   {
                        targets.splice(i,1,new RubyUnit(target.substring(0,div1)),
                                       new RubyUnit(target.substring(div1),rubying.ruby));
                        i++;
                   }
                   else if (div1 == 0 && div2 == target.length)
                   {
                        targets[i].ruby = rubying.ruby;
                   }
                }
            }

        });
        return targets;
    }

    Translate(text)
    {
        let r = [];
        let target = text;
        const reg = new RegExp(this.ruby_parent + "(.+?)" + this.ruby_begin + "(.+?)" + this.ruby_end)
        do
        {
            const rubyblock = target.match(reg);
            if (rubyblock)
            {
                if (rubyblock.index > 0)
                {
                    r.push(new RubyUnit(target.substring(0,rubyblock.index)));
                }
                r.push(new RubyUnit(rubyblock[1],rubyblock[2]));
                target = target.substring(rubyblock.index + rubyblock[0].length);
            }
            else
            {
                r.push(new RubyUnit(target));
                break;
            }
        } while (target.length > 0);

        for (let i = 0;i < r.length;i++)
        {
            if (r[i].noRuby)
            {
                const arw = this.AtRubying(r[i].base);
                if (arw.length == 1 && arw[0].hasRuby)
                {
                    r[i].ruby = arw[0].ruby;
                }
                else if (arw.length > 1)
                {
                    r.splice(i,1,...arw);
                }
            }
        }
        return r;
    }
    
}

//ルビを含む行頭タイムタグ歌詞一行
class RubyLyricsLine
{
    constructor(units,starttime)
    {
        this.units = units;
        this.starttime = starttime;
    }
}
class RubyLyricsContainer
{
    constructor(lyricstext)
    {
        this.lines = [];
        this.AtRubyTag = new AtRubyTag();
        this.AtRubyTag.LoadAtRubyTag(lyricstext);
        lyricstext.split(/\r\n|\r|\n/).forEach(line => {
            let word = new TimeTagElement(line);
            if (word.starttime >= 0)
            {
                this.lines.push(new RubyLyricsLine(this.AtRubyTag.Translate(word.text),word.starttime));
            }
        });
        this.lines.push(new RubyLyricsLine(this.AtRubyTag.Translate(""),new TimeTagElement("[99:59.99]").starttime));
    }

}

//ルビ付き（かもしれない）カラオケタイムタグ付き文字
class RubyKaraokeUnit
{
    constructor(base_karaokeunit,ruby_karaokeunit = null)
    {
        this.base = base_karaokeunit;
        this.ruby = ruby_karaokeunit;
        if (this.noRuby)
        {
            this.Starttime = this.base.starttime;
            this.Endtime = this.base.endtime;
        }
        else
        {
            if (this.base.starttime < 0 && this.ruby.starttime < 0)
                this.Starttime = -1;
            else if (this.base.starttime >= 0 && this.ruby.starttime >= 0)
            {
                this.Starttime = Math.min(this.base.starttime,this.ruby.starttime);
            }
            else
            {
                this.Starttime = Math.max(this.base.starttime,this.ruby.starttime);
                this.base.starttime = this.ruby.starttime = this.Starttime;
            }
            this.Endtime = Math.max(this.base.endtime,this.ruby.endtime);
            this.base.endtime = this.base.endtime < 0 ? this.Endtime : this.base.endtime;
            this.ruby.endtime = this.ruby.endtime < 0 ? this.Endtime : this.ruby.endtime;
        }
    }
    set starttime(value) {
        if (this.base.starttime < 0)
            this.base.starttime = value;
        if (this.hasRuby && this.ruby.starttime < 0)
            this.ruby.starttime = value;
        this.Starttime= value;
    }
    get starttime(){return this.Starttime;}

    set endtime(value) {
        if (this.base.endtime < 0)
            this.base.endtime = value;
        if (this.hasRuby && this.ruby.endtime < 0)
            this.ruby.endtime = value;
        this.Endtime= value;
    }
    get endtime(){return this.Endtime;}

    get hasRuby() {return this.ruby != null;}
    get noRuby() {return this.ruby == null;}

}

//ルビを含むカラオケタイムタグ歌詞一行
class RubyKaraokeLine
{
    constructor(textline,atrubytag,endtime = -1)
    {
        this.units = [];
        const ruby_units = atrubytag.Translate(textline);
        for (let i = 0; i < ruby_units.length;i++)
        {
            const base_unit = new KaraokeUnit(ruby_units[i].base);
            let newunit;
            if (ruby_units[i].hasRuby)
            {
                const ruby_unit = new KaraokeUnit(ruby_units[i].ruby);
                newunit = new RubyKaraokeUnit(base_unit,ruby_unit);
            }
            else
            {
                newunit = new RubyKaraokeUnit(base_unit,null);
            }
            if (i < ruby_units.length - 1 && newunit.endtime < 0)
            {
                newunit.endtime = ruby_units[i+1].starttime;
            }
            this.units.push(newunit);
        }
        if (this.units[this.units.length-1].endtime < 0)
            this.units[this.units.length-1].endtime = endtime;

//[]タイムタグで認識しなかった@rubyを追加したいが、このデータ構造だとめっちゃめんどくさいな

        this.starttime = this.units[0].starttime;
        this.endtime = Math.max(this.units[this.units.length-1].endtime,endtime);
    }
}

class RubyKaraokeContainer
{
    constructor(karaoketext)
    {
        this.AtRubyTag = new AtRubyTag();
        this.AtRubyTag.LoadAtRubyTag(karaoketext);

        this.lines = [];
        karaoketext.split(/\r\n|\r|\n/).forEach(line => {
 
            let linehead = line.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
            if (linehead)
            {
                this.lines.push(new RubyKaraokeLine(line,this.AtRubyTag));
            }
        });
        this.lines.push(new RubyKaraokeLine("[99:59.99]",this.AtRubyTag));

        for (let i = 0;i< this.lines.length - 1;i++)
        {
            if (this.lines[i].endtime < this.lines[i+1].starttime)
                this.lines[i].endtime = this.lines[i+1].starttime;
        }

    }
}