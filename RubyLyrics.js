
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
        let result = [];
        result.push(new RubyUnit(text));
        this.rubying.forEach(rubying =>
        {
            for (let i = 0;i < result.length;i++)
            {
                if (result[i].hasRuby)
                    continue;

                const target = result[i].base;
                const index = target.indexOf(rubying.target);
                if (index >= 0)
                {
                    const div1 = index + rubying.parent_offset;
                    const div2 = index + rubying.parent_offset + rubying.parent_length;

                    if (div1 > 0 && div2 < target.length)
                    {
                        result.splice(i,1,new RubyUnit(target.substring(0,div1)),
                                           new RubyUnit(target.substring(div1,div2),rubying.ruby),
                                           new RubyUnit(target.substring(div2)));
                        i++;
                    }
                    else if (div1 == 0 && div2 < target.length)
                    {
                        result.splice(i,1,new RubyUnit(target.substring(0,div2),rubying.ruby),
                                           new RubyUnit(target.substring(div2)));

                   }               
                   else if (div1 > 0 && div2 == target.length)
                   {
                        result.splice(i,1,new RubyUnit(target.substring(0,div1)),
                                       new RubyUnit(target.substring(div1),rubying.ruby));
                        i++;
                   }
                   else if (div1 == 0 && div2 == target.length)
                   {
                        result[i].ruby = rubying.ruby;
                   }
                }
            }

        });
        return result;
    }



    Translate(text)
    {
        //エスケープコードは拾った
        (function (w) {
            var reRegExp = /[\\^$.*+?()[\]{}|]/g,
                reHasRegExp = new RegExp(reRegExp.source);
        
            function escapeRegExp(string) {
                return (string && reHasRegExp.test(string))
                    ? string.replace(reRegExp, '\\$&')
                    : string;
            }
        
            w.escapeRegExp = escapeRegExp;
        })(window);
    
        let result = [];
        let target = text;
        const reg = new RegExp(escapeRegExp(this.ruby_parent) + "(.+?)" + escapeRegExp(this.ruby_begin) + "(.+?)" + escapeRegExp(this.ruby_end));
        do
        {
            const rubyblock = target.match(reg);
            if (rubyblock)
            {
                if (rubyblock.index > 0)
                {
                    result.push(new RubyUnit(target.substring(0,rubyblock.index)));
                }
                result.push(new RubyUnit(rubyblock[1],rubyblock[2]));
                target = target.substring(rubyblock.index + rubyblock[0].length);
            }
            else
            {
                result.push(new RubyUnit(target));
                break;
            }
        } while (target.length > 0);

        for (let i = 0;i < result.length;i++)
        {
            if (result[i].noRuby)
            {
                const arw = this.AtRubying(result[i].base);
                if (arw.length == 1 && arw[0].hasRuby)
                {
                    result[i].ruby = arw[0].ruby;
                }
                else if (arw.length > 1)
                {
                    result.splice(i,1,...arw);
                }
            }
        }
        return result;
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
        this.lines.push(new RubyLyricsLine(this.AtRubyTag.Translate(""),TimeTagElement.Create("[99:59.99]").starttime));
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
    constructor(textline,atrubytag,endtime)
    {
        this.units = [];
        const ruby_units = atrubytag.Translate(textline);
        for (let i = 0; i < ruby_units.length;i++)
        {
            this.units.push(
                new RubyKaraokeUnit(
                    KaraokeUnit.Create(ruby_units[i].base),
                    ruby_units[i].hasRuby ? KaraokeUnit.Create(ruby_units[i].ruby) : null));
        }
        if (this.units[this.units.length-1].endtime < 0)
            this.units[this.units.length-1].endtime = endtime;

//[]タイムタグで認識しなかった@rubyを追加したいが、このデータ構造だとめっちゃめんどくさいな

        let linestring = "";
        this.units.forEach(unit =>{
            linestring = unit.base.string;
        });
        const atruby_units = atrubytag.AtRubying(linestring);
        if (atruby_units.length > 1 || atruby_units[0].hasRuby)
        {
            let base_index = 0;
            for (let i = 0;i < atruby_units.length;i++)
            {
                if (atruby_units[i].hasRuby && this.check_addrubybase(base_index,atruby_units[i].base.length))
                {
                    let units_i,element_i;
                    [units_i,element_i] = this.get_index(base_index);

                    const div1 = element_i;
                    const div2 = element_i + atruby_units[i].base.length;

                    if (div1 > 0 && div2 < this.units[units_i].base.string.length)
                    {
                        let tail = this.units[units_i].base.DivideRear(div2);
                        let middle = this.units[units_i].base.DivideRear(div1);

                        const tail_rkunit  = new RubyKaraokeUnit(tail);
                        const middle_rkunit  = new RubyKaraokeUnit(middle,KaraokeUnit.Create(atruby_units[i].ruby));
                        this.units.splice(i+1,0,middle_rkunit,tail_rkunit);
                    }
                    else if (div1 == 0 && div2 < this.units[units_i].base.string.length)
                    {
                        let tail = this.units[units_i].base.DivideRear(div2);
                        this.units[units_i].ruby = KaraokeUnit.Create(atruby_units[i].ruby);
                        this.units.splice(i+1,0,new RubyKaraokeUnit(tail));
                    }               
                    else if (div1 > 0 && div2 == this.units[units_i].base.string.length)
                    {
                        let head = this.units[units_i].base.DivideFront(div1);
                        this.units.splice(i,0,new RubyKaraokeUnit(head,KaraokeUnit.Create(atruby_units[i].ruby)));
                    }
                    else if (div1 == 0 && div2 == this.units[units_i].base.string.length)
                    {
                        this.units[units_i].ruby = KaraokeUnit.Create(atruby_units[i].ruby);
                    }
                }
                base_index += atruby_units[i].base.length;
            }
        }


//RubyKaraokeUnit境界でのタイムタグ補完処理
        for (let i = 1;i < this.units.length-1;i++)
        {
            if (this.units[i-1].endtime < 0)
            {
                if (this.units[i].starttime >= 0)
                    this.units[i-1].endtime = this.units[i].starttime;
                else
                {
                    const prevtime = this.units[i-1].base.elements[this.units[i-1].base.elements.length-1].starttime;
                    const prevcount = this.units[i-1].base.elements[this.units[i-1].base.elements.length-1].text.length;

                    let nexttime = -1;
                    let nextcount = 0;
                    for (let j = i;j < this.units.length;j++)
                    {
                        for (let k = 0;k < this.units[j].base.elements.length;k++)
                        {
                            if (this.units[j].base.elements[k].starttime >= 0)
                            {
                                nexttime = this.units[j].base.elements[k].starttime;
                                break;
                            }
                            nextcount += this.units[j].base.elements[k].text.length;
                        }
                        if (nexttime >= 0)
                            break;
                        if (this.units[j].endtime >= 0)
                        {
                            nexttime = this.units[j].endtime;
                            break;
                        }
                    }
                    this.units[i-1].endtime = (prevtime * nextcount + nexttime * prevcount) / (prevcount + nextcount);
                }
            }
            if (this.units[i].starttime < 0)
            {
                this.units[i].starttime = this.units[i-1].endtime;
            }
        }
        if (this.units.length == 2)
        {
            if (this.units[0].endtime < 0)
            {
                if (this.units[1].starttime >= 0)
                    this.units[0].endtime = this.units[1].starttime;
                else
                {
                    const prevtime = this.units[0].base.elements[this.units[0].base.elements.length-1].starttime;
                    const prevcount = this.units[0].base.elements[this.units[0].base.elements.length-1].text.length;

                    let nexttime = -1;
                    let nextcount = 0;
                    for (let j = 0;j < this.units[1].base.elements.length;j++)
                    {
                        if (this.units[1].base.elements[j].starttime >= 0)
                        {
                            nexttime = this.units[1].base.elements[j].starttime;
                            break;
                        }
                        nextcount += this.units[1].base.elements[j].text.length;
                    }
                    if (nexttime < 0)
                    {
                        nexttime = this.units[1].endtime;
                    }
                    this.units[0].endtime = (prevtime * nextcount + nexttime * prevcount) / (prevcount + nextcount);
                }
            }
            if (this.units[1].starttime < 0)
            {
                this.units[1].starttime = this.units[0].endtime;
            }
        }

        this.starttime = this.units[0].starttime;
        this.endtime = Math.max(this.units[this.units.length-1].endtime,endtime);
    }

    check_addrubybase(index,length)
    {
        let distance = 0;
        for (let i = 0; i < this.units.length;i++)
        {
            if (index < distance + this.units[i].base.elements.length)
            {
                return (this.units[i].noRuby && (index + length <= distance + this.units[i].base.string.length));
            }
            else
            {
                distance += this.units[i].base.string.length;
            }
        }
        return false;
    }
    get_index(index)
    {
        let distance = 0;
        for (let i = 0; i < this.units.length;i++)
        {
            if (index < distance + this.units[i].base.elements.length)
            {
                return [i,index - distance];
            }
            else
            {
                distance += this.units[i].base.elements.length;
            }
        }
        return [-1,-1];
    }
}

class RubyKaraokeContainer
{
    constructor(karaoketext)
    {
        this.AtRubyTag = new AtRubyTag();
        this.AtRubyTag.LoadAtRubyTag(karaoketext);

        let lines = []
        karaoketext.split(/\r\n|\r|\n/).forEach(line => {
 
            let linehead = line.match(/^\[(\d+):(\d+)[:.](\d+)\]/);
            if (linehead)
            {
                lines.push(line);
            }
        });
        lines.push("[99:59.99]");

        this.lines = [];
        for (let i = 0;i< lines.length - 1;i++)
        {
            const nexttime = TimeTagElement.Create(lines[i + 1]).starttime;
            this.lines.push(new RubyKaraokeLine(lines[i],this.AtRubyTag,nexttime));
        }

    }
}