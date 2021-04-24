
class RubyWord
{
    constructor(word,ruby = "")
    {
        this.word = word;
        this.ruby = ruby;
    }
}

class RubyText
{
    constructor(text,atrubytag)
    {
        this.words = atrubytag.Translate(text);
    }
}

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
        targets.push(new RubyWord(text,""));
        this.rubying.forEach(rubying =>
        {
            for (let i = 0;i < targets.length;i++)
            {
                if (targets[i].ruby != "")
                    continue;

                const target = targets[i].word;
                const index = target.indexOf(rubying.target);
                if (index >= 0)
                {
                    const div1 = index + rubying.parent_offset;
                    const div2 = index + rubying.parent_offset + rubying.parent_length;

                    if (div1 > 0 && div2 < target.length)
                    {
                        targets.splice(i,1,new RubyWord(target.substring(0,div1)),
                                           new RubyWord(target.substring(div1,div2),rubying.ruby),
                                           new RubyWord(target.substring(div2)));
                        i++;
                    }
                    else if (div1 == 0 && div2 < target.length)
                    {
                        targets.splice(i,1,new RubyWord(target.substring(0,div2),rubying.ruby),
                                           new RubyWord(target.substring(div2)));

                   }               
                   else if (div1 > 0 && div2 == target.length)
                   {
                        targets.splice(i,1,new RubyWord(target.substring(0,div1)),
                                       new RubyWord(target.substring(div1),rubying.ruby));
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
                    r.push(new RubyWord(target.substring(0,rubyblock.index),""));
                }
                r.push(new RubyWord(rubyblock[1],rubyblock[2]));
                target = target.substring(rubyblock.index + rubyblock[0].length);
            }
            else
            {
                r.push(new RubyWord(target,""));
                break;
            }
        } while (target.length > 0);

        for (let i = 0;i < r.length;i++)
        {
            if (r[i].ruby == "")
            {
                const arw = this.AtRubying(r[i].word);
                if (arw.length == 1 && arw[0].ruby != "")
                {
                    r[i].ruby = arw[0].ruby;
                }
                else if (arw.length > 1)
                {
                    r.splice(i,1);
                    arw.forEach( w => {
                        r.splice(i,0,w);
                    });
                }
            }
        }
        return r;
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
                let rubyline = new RubyText(word.text,this.AtRubyTag);
                rubyline.starttime = word.starttime;
                this.lines.push(rubyline);
            }
        });
        let lastline = new RubyText("",this.AtRubyTag);
        lastline.starttime = new TimeTagElement("[99:59.99]").starttime;

        this.lines.push(lastline);
    }

}

class TimeTagRubyWord
{
    constructor(word_ttset,ruby_ttset)
    {
        this.word = word_ttset;
        this.ruby = ruby_ttset;
        if (this.word.elements[0].starttime < 0 && this.ruby.elements[0].starttime < 0)
            this.starttime = -1;
        else if (this.word.elements[0].starttime >= 0 && this.ruby.elements[0].starttime >= 0)
            this.starttime = Math.min(this.word.elements[0].starttime,this.ruby.elements[0].starttime);
        else
            this.starttime = Math.max(this.word.elements[0].starttime,this.ruby.elements[0].starttime);

        const wle = this.word.elements[this.word.elements.length-1];
        const rle = this.ruby.elements[this.ruby.elements.length-1];
        const wet = (wle.text == "" && wle.starttime >= 0) ? wle.starttime : -1;
        const ret = (rle.text == "" && rle.starttime >= 0) ? rle.starttime : -1;
        this.endtime = Math.max(wet,ret);
    }
}

class RubyKaraokeLine
{
    constructor(textline,atrubytag)
    {
        this.Words = [];
        const words = atrubytag.Translate(textline);
        for (let i = 0; i < words.length;i++)
        {
            const wordtts = new TimeTagSet(words[i].word);
            if (words[i].ruby != "")
            {
                const rubytts = new TimeTagSet(words[i].ruby);
                this.Words.push(new TimeTagRubyWord(wordtts,rubytts));
            }
            else
            {
                this.Words.push(new TimeTagRubyWord(wordtts,new TimeTagSet("")));
            }
        }
//[]タイムタグで認識しなかった@rubyを追加したいが、このデータ構造だとめっちゃめんどくさいな

        this.starttime = this.Words[0].starttime;

    }
}

class RubyKaraokeContainer
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
        if (lines.length == 1)
        {
            return;
        }

        this.AtRubyTag = new AtRubyTag();
        this.AtRubyTag.LoadAtRubyTag(karaoketext);
        let line = new RubyKaraokeLine(lines[0],this.AtRubyTag);
        for (let i = 0;i< lines.length - 1;i++)
        {
            let nextline = new RubyKaraokeLine(lines[i+1],this.AtRubyTag);
            
            const lasttime = line.Words[line.Words.length-1].starttime;
            line.endtime = nextline.starttime > lasttime ? nextline.starttime : lasttime;

            this.lines.push(line);
            line = nextline;
        }

    }
}