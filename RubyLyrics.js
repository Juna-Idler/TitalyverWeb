
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
        this.Words = atrubytag.Translate(text);
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
                    continue;
                }
                if (name == "ruby_parent")
                {
                    this.ruby_parent = value;
                    continue;
                }
                if (name == "ruby_begin")
                {
                    this.ruby_begin = value;
                    continue;
                }
                if (name == "ruby_end")
                {
                    this.ruby_end = value;
                    continue;
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
            let word = new TimeTagedText(line);
            if (word.starttime >= 0)
            {
                let rubyline = new RubyText(word.word,this.AtRubyTag);
                rubyline.starttime = word.starttime;
                this.lines.push(rubyline);
            }
        });
        let lastline = new RubyText("",this.AtRubyTag);
        lastline.starttime = new TimeTagedText("[99:59.99]").starttime;

        this.lines.push(lastline);
    }

}