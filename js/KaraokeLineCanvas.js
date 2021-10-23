

class KaraokeLineCanvas
{
    constructor(karaokeline,
                fontsize,font,outline,
                rubyfontsize,rubyfont,rubyoutline,rubyheight,
                activeStrokeColor,activeFillColor,
                standbyStrokeColor,standbyFillColor,
                lineJoin,miterLimit)
    {
        if (!karaokeline.Complement())
            throw "KaraokeLineCanvas constructor:karaokeline(RubyKaraokeLyricsLine) is invalid.";
        this.karaokeline = karaokeline;
        this.fontsize = fontsize;
        this.font = font;
        this.outline = outline;
        this.rubyfontsize = rubyfontsize;
        this.rubyfont = rubyfont;
        this.rubyoutline = rubyoutline;
        this.rubyheight = rubyheight;
        this.activeStrokeColor = activeStrokeColor;
        this.activeFillColor = activeFillColor;
        this.standbyStrokeColor = standbyStrokeColor;
        this.standbyFillColor = standbyFillColor;
        this.lineJoin = lineJoin;
        this.miterLimit = miterLimit;

        this.canvas = document.createElement("canvas");
        const ctx = this.canvas.getContext("2d");
        ctx.textBaseline = "top";

        const fonttext = `${fontsize}px ${font}`;
        const rubyfonttext = `${rubyfontsize}px ${rubyfont}`;
    
        let x = outline / 2;
        let ruby_x = 0;
        for (let i = 0 ; i < karaokeline.units.length;i++)
        {
            const unit = this.karaokeline.units[i];

            ctx.font = unit.hasRuby ? rubyfonttext : fonttext;
            let width = 0;
            const widths = new Array(unit.phonetic.text_array.length);
            for (let j = 0;j < widths.length;j++)
            {
                const m = ctx.measureText(unit.phonetic.text_array[j]);
                widths[j] = m.width;
                width += m.width;
            }
            unit.phonetic_widths = widths;
            unit.phonetic.ComplementAllTime(widths);

            if (unit.hasRuby)
            {
                ctx.font = fonttext;
                const bm = ctx.measureText(unit.base_text);
    
                const offset = (bm.width - width) / 2;
                if (ruby_x + offset < 0)
                    x += -(ruby_x + offset);

                unit.x = x;
                unit.rubyoffset = offset;
                unit.width = bm.width;

                x += bm.width;
                ruby_x = offset;
            }
            else
            {
                unit.x = x;
                unit.width = width;

                x += width;
                ruby_x += width;
            }
        }
        this.canvas.width = x + ((ruby_x < 0) ? -ruby_x : 0);
        this.canvas.height = (fontsize + outline) + rubyheight;
        ctx.textBaseline = "top";
        ctx.lineJoin = this.lineJoin;
        ctx.miterLimit = this.miterLimit;
    }


    Draw(time)
    {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

        const fonttext = `${this.fontsize}px ${this.font}`;
        const rubyfonttext = `${this.rubyfontsize}px ${this.rubyfont}`;


        for (let i = 0 ; i < this.karaokeline.units.length;i++)
        {
            const unit = this.karaokeline.units[i];
            const phonetic = unit.phonetic.text_array.join("");

            if (unit.start_time < time && time < unit.end_time)
            {
                let x = 0;
                for (let j = 0;j < unit.phonetic.text_array.length;j++)
                {
                    if (unit.phonetic.start_times[j] < time && time < unit.phonetic.end_times[j])
                    {
                        const rate = (time - unit.phonetic.start_times[j]) / (unit.phonetic.end_times[j] - unit.phonetic.start_times[j]);
                        x += unit.phonetic_widths[j] * rate
                        break;
                    }
                    x += unit.phonetic_widths[j];
                }
                if (unit.hasRuby)
                {
                    const rate = (time - unit.start_time) / (unit.end_time - unit.start_time);
                    const base_x = unit.width * rate;

                    ctx.font = fonttext;
                    ctx.lineWidth = this.outline;

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0,0,unit.x + base_x,this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.activeStrokeColor;
                    ctx.fillStyle = this.activeFillColor;
                    ctx.strokeText(unit.base_text,unit.x,this.rubyheight + this.outline/2);
                    ctx.fillText(unit.base_text,unit.x,this.rubyheight + this.outline/2);
                    ctx.restore();
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(unit.x + base_x,0,this.canvas.width - (unit.x + base_x),this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.standbyStrokeColor;
                    ctx.fillStyle = this.standbyFillColor;
                    ctx.strokeText(unit.base_text,unit.x,this.rubyheight + this.outline/2);
                    ctx.fillText(unit.base_text,unit.x,this.rubyheight + this.outline/2);
                    ctx.restore();


                    ctx.font = rubyfonttext;
                    ctx.lineWidth = this.rubyoutline;
                    ctx.font = rubyfonttext;
                    ctx.lineWidth = this.rubyoutline;
    
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0,0,unit.x + unit.rubyoffset + x,this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.activeStrokeColor;
                    ctx.fillStyle = this.activeFillColor;
                    ctx.strokeText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
                    ctx.fillText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
                    ctx.restore();
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(unit.x + unit.rubyoffset + x,0,this.canvas.width - (unit.x + unit.rubyoffset + x),this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.standbyStrokeColor;
                    ctx.fillStyle = this.standbyFillColor;
                    ctx.strokeText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
                    ctx.fillText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
                    ctx.restore();
                }
                else
                {
                    ctx.font = fonttext;
                    ctx.lineWidth = this.outline;

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0,0,unit.x + x,this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.activeStrokeColor;
                    ctx.fillStyle = this.activeFillColor;
                    ctx.strokeText(phonetic,unit.x,this.rubyheight + this.outline/2);
                    ctx.fillText(phonetic,unit.x,this.rubyheight + this.outline/2);
                    ctx.restore();
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(unit.x + x,0,this.canvas.width - (unit.x + x),this.canvas.height);
                    ctx.clip();
                    ctx.strokeStyle = this.standbyStrokeColor;
                    ctx.fillStyle = this.standbyFillColor;
                    ctx.strokeText(phonetic,unit.x,this.rubyheight + this.outline/2);
                    ctx.fillText(phonetic,unit.x,this.rubyheight + this.outline/2);
                    ctx.restore();
                }

                continue;
            }
            if (time <= unit.start_time)
            {
                ctx.strokeStyle = this.standbyStrokeColor;
                ctx.fillStyle = this.standbyFillColor;
            }
            else if (time >= unit.end_time)
            {
                ctx.strokeStyle = this.activeStrokeColor;
                ctx.fillStyle = this.activeFillColor;
            }
            if (unit.hasRuby)
            {
                ctx.font = fonttext;
                ctx.lineWidth = this.outline;
                ctx.strokeText(unit.base_text,unit.x,this.rubyheight + this.outline/2);
                ctx.fillText(unit.base_text,unit.x,this.rubyheight + this.outline/2);

                ctx.font = rubyfonttext;
                ctx.lineWidth = this.rubyoutline;
                ctx.strokeText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
                ctx.fillText(phonetic,unit.x + unit.rubyoffset,this.rubyoutline / 2);
            }
            else
            {
                ctx.font = fonttext;
                ctx.lineWidth = this.outline;
                ctx.strokeText(phonetic,unit.x,this.rubyheight + this.outline/2);
                ctx.fillText(phonetic,unit.x,this.rubyheight + this.outline/2);
            }
        }
    }
}