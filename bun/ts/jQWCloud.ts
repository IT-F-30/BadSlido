// Constants
enum SpaceType {
    LB = 1,  // Left Bottom
    LT = 2,  // Left Top
    RT = 3,  // Right Top
    RB = 4   // Right Bottom
}

enum AlignmentType {
    HR = 1,  // Horizontal
    VR = 2   // Vertical
}

const WordObjType = 'span';
const DIV = 'div';
const Word_Default_font_Family = 'Impact';
let distance_Counter = 1;
let word_counter = 1;

// Interfaces
interface WordInput {
    word: string;
    weight: number;
    color?: string;
    font_family?: string;
    word_class?: string;
}

interface WordConfig extends WordInput {
    fontFactor: number;
    fontOffset: number;
    minWeight: number;
    padding_left?: number;
}

interface CloudOptions {
    words: WordInput[];
    fontOffset?: number;
    showSpaceDIV?: boolean;
    verticalEnabled?: boolean;
    cloud_color?: string;
    cloud_font_family?: string;
    spaceDIVColor?: string;
    padding_left?: number;
    word_common_classes?: string;
    maxFont: number;
    minFont: number;
    beforeCloudRender?: () => void;
    afterCloudRender?: () => void;
}

interface SpaceData {
    spaceType: SpaceType;
    width: number;
    height: number;
    x: number;
    y: number;
}

// Utility class
class Util {
    // Generate Random Colors For Words
    static getRandomColor(): string {
        const letters = '0123456789ABCDEF'.split('');
        let color = '#';
        for (let i = 0; i < 6; i++) {
            const minHex = 5;
            const idx = Math.floor(Math.random() * (16 - minHex)) + minHex;
            color += letters[idx];
        }
        return color;
    }
}

// Space class
class Space implements SpaceData {
    constructor(
        public spaceType: SpaceType,
        public width: number,
        public height: number,
        public x: number,
        public y: number
    ) { }
}

// Word class
class Word {
    word: string;
    weight: number;
    fontFactor: number;
    fontOffset: number;
    minWeight: number;
    padding_left?: number;
    font_family?: string;
    font: number = 0;
    color?: string;
    span: HTMLSpanElement | null = null;
    width: number = 0;
    height: number = 0;
    word_class?: string;

    constructor(wordConfig: WordConfig) {
        this.word = wordConfig.word;
        this.weight = wordConfig.weight;
        this.fontFactor = wordConfig.fontFactor;
        this.fontOffset = wordConfig.fontOffset;
        this.minWeight = wordConfig.minWeight;
        this.padding_left = wordConfig.padding_left;
        this.font_family = wordConfig.font_family;
        this.color = wordConfig.color;
        this.word_class = wordConfig.word_class;

        this._init();
    }

    private _init(): void {
        this._setFont();
        this._setSpan_Size();
    }

    private _setFont(): void {
        this.font = Math.floor(((this.weight - this.minWeight) * this.fontFactor) + this.fontOffset);
    }

    private _setSpan_Size(): void {
        const span = document.createElement(WordObjType) as HTMLSpanElement;
        span.setAttribute('id', `Word_${word_counter++}_${this.weight}`);
        document.body.appendChild(span);

        $(span).css({
            position: 'absolute',
            display: 'block',
            left: -999990,
            top: 0
        });
        $(span).css("font-size", `${this.font}px`);

        if (this.font_family != null && this.font_family !== '') {
            $(span).css("font-family", this.font_family);
        } else {
            $(span).css("font-family", Word_Default_font_Family);
        }

        if (this.word_class != null && this.word_class !== '') {
            $(span).addClass(this.word_class);
        }

        if (this.color != null && this.color !== '') {
            $(span).css("color", this.color);
        } else {
            $(span).css("color", Util.getRandomColor());
        }

        $(span).css("-webkit-user-select", "none")
            .css("-moz-user-select", "none")
            .css("-ms-user-select", "none")
            .css("user-select", "none")
            .css("-o-user-select", "none");
        $(span).css("line-height", `${this.font}px`);

        if (this.padding_left == null) {
            this.padding_left = 0;
        }

        $(span).css("padding-left", `${this.padding_left}px`);
        $(span).html(this.word);

        this.width = $(span).outerWidth()! + (this.padding_left * 2);
        this.height = $(span).outerHeight()!;

        $(span).remove();
        this.span = span;
    }
}

// WordCloud class
class WordCloud {
    private defaultOptions: Partial<CloudOptions> = {
        words: [],
        fontOffset: 0,
        showSpaceDIV: false,
        verticalEnabled: true,
        cloud_color: undefined,
        cloud_font_family: undefined,
        spaceDIVColor: 'white',
        padding_left: undefined,
        word_common_classes: undefined
    };

    private minWeight: number | null = null;
    private maxWeight: number | null = null;
    private spaceDataObject: { [key: string]: Space | null } = {};
    private spaceIdArray: string[] = [];
    private words: WordInput[] = [];
    private fontFactor: number = 1;
    private options!: CloudOptions;
    private $target!: JQuery;
    private tWidth: number = 0;
    private xOffset: number = 0;
    private tHeight: number = 0;
    private yOffset: number = 0;

    private methods: { [key: string]: () => void } = {
        destroy: () => this._destroy()
    };

    _init(options?: CloudOptions | string): void {
        // Calling Methods from this.methods
        if (options != null && typeof options === 'string') {
            if (this.methods[options] != null) {
                this.methods[options]();
            }
            return;
        }

        if (options == null) {
            this.options = this.defaultOptions as CloudOptions;
        } else if (options != null && typeof options === 'object') {
            this.options = $.extend(this.defaultOptions, options) as CloudOptions;
        }

        this.spaceDataObject = {};
        this.spaceIdArray = [];

        this.words = this.options.words;
        // Sorting Words according to weight descending order
        this.words.sort((a, b) => {
            if (a.weight < b.weight) return 1;
            if (a.weight > b.weight) return -1;
            return 0;
        });

        this._start();
        this._final();
    }

    private _setFontFactor(): void {
        this.maxWeight = this.words[0].weight;
        this.minWeight = this.words[this.words.length - 1].weight;
        this.fontFactor = (this.options.maxFont - this.options.minFont) / (this.maxWeight - this.minWeight);
    }

    private _start(): void {
        this._destroy();
        this._setFontFactor();
        this._draw();
    }

    private _final(): void {
        // Final operations if needed
    }

    private _destroy(): void {
        this.$target.html('');
    }

    _setTarget($target: JQuery): void {
        this.$target = $target;
        $target.css("position", "relative");
        this.tWidth = $target.innerWidth()!;
        this.xOffset = this.tWidth / 2;

        this.tHeight = $target.innerHeight()!;
        this.yOffset = this.tHeight / 2;
    }

    private _draw(): void {
        for (let index = 0; index < this.words.length; index++) {
            const currWord = this.words[index];
            const wordConfigObj: WordConfig = {
                word: currWord.word,
                weight: currWord.weight,
                fontFactor: this.fontFactor,
                fontOffset: (this.options.fontOffset || 0) + this.options.minFont,
                minWeight: this.minWeight!
            };

            if (this.options.cloud_color != null) {
                wordConfigObj.color = this.options.cloud_color;
            } else {
                wordConfigObj.color = currWord.color;
            }

            if (this.options.padding_left != null) {
                wordConfigObj.padding_left = this.options.padding_left;
            }

            wordConfigObj.word_class = currWord.word_class;

            if (this.options.cloud_font_family != null) {
                wordConfigObj.font_family = this.options.cloud_font_family;
            } else {
                wordConfigObj.font_family = currWord.font_family;
            }

            const wordObj = new Word(wordConfigObj);

            if (this.options.word_common_classes != null) {
                $(wordObj.span!).addClass(this.options.word_common_classes);
            }

            if (index === 0) {
                this._placeFirstWord(wordObj);
            } else {
                this._placeOtherWord(wordObj);
            }
        }
    }

    private _updateSpaceIdArray(distanceS: string, distance: number): void {
        if (this.spaceIdArray.length !== 0) {
            for (let index = 0; index < this.spaceIdArray.length; index++) {
                if (distance < parseFloat(this.spaceIdArray[index].split("_")[0])) {
                    this.spaceIdArray.splice(index, 0, distanceS);
                    return;
                }
            }
            this.spaceIdArray.push(distanceS);
        } else {
            this.spaceIdArray.push(distanceS);
        }
    }

    private _showSpaceDiv(type: SpaceType, w: number, h: number, x: number, y: number): void {
        let xMul = 1;
        let yMul = 1;

        switch (type) {
            case SpaceType.LB:
                xMul = 0;
                yMul = -1;
                break;
            case SpaceType.LT:
                xMul = 0;
                yMul = 0;
                break;
            case SpaceType.RT:
                xMul = -1;
                yMul = 0;
                break;
            case SpaceType.RB:
                xMul = -1;
                yMul = -1;
                break;
        }

        const div = document.createElement(DIV);
        $(div).css("left", x + xMul * w)
            .css("top", y + yMul * h)
            .css("width", w)
            .css("height", h)
            .css("border", `1px ${this.options.spaceDIVColor} solid`)
            .css("position", "absolute")
            .css("display", "block");
        this.$target.append(div);
    }

    private _pushSpaceData(type: SpaceType, w: number, h: number, x: number, y: number): void {
        // Calculating Distance between (x,y): Key point of Space and Center of Container (this.xOffset,this.yOffset)
        const distance = Math.sqrt((this.xOffset - x) * (this.xOffset - x) + (this.yOffset - y) * (this.yOffset - y));
        const distanceS = `${distance}_${distance_Counter++}`;

        // Update Space Id Array
        this._updateSpaceIdArray(distanceS, distance);
        // Add Space into Space Data Object
        this.spaceDataObject[distanceS] = new Space(type, w, h, x, y);

        // To Show The Space
        if (this.options.showSpaceDIV) {
            this._showSpaceDiv(type, w, h, x, y);
        }
    }

    private _placeFirstWord(word: Word): void {
        const w = word.width;
        const h = word.height;
        const xoff = this.xOffset - w / 2;
        const yoff = this.yOffset - h / 2;
        const tw = this.tWidth;
        const th = this.tHeight;

        const span = word.span!;
        $(span).css("left", xoff)
            .css("top", yoff)
            .css("display", "inline");
        this.$target.append(span);

        this._pushSpaceData(SpaceType.LB, tw - xoff - w, h, xoff + w, yoff + h / 2);   // M1
        this._pushSpaceData(SpaceType.LT, w, th - yoff - h, xoff + w / 2, yoff + h);   // M2
        this._pushSpaceData(SpaceType.RT, xoff, h, xoff, yoff + h / 2);                // M3
        this._pushSpaceData(SpaceType.RB, w, yoff, xoff + w / 2, yoff);                // M4

        this._pushSpaceData(SpaceType.LT, w / 2, h / 2, xoff + w, yoff + h / 2);       // C1
        this._pushSpaceData(SpaceType.RT, w / 2, h / 2, xoff + w / 2, yoff + h);       // C2
        this._pushSpaceData(SpaceType.RB, w / 2, h / 2, xoff, yoff + h / 2);           // C3
        this._pushSpaceData(SpaceType.LB, w / 2, h / 2, xoff + w / 2, yoff);           // C4

        this._pushSpaceData(SpaceType.LT, tw - xoff - w - w / 2, th - yoff - h / 2, xoff + w + w / 2, yoff + h / 2);  // S1
        this._pushSpaceData(SpaceType.RT, xoff + w / 2, th - yoff - h - h / 2, xoff + w / 2, yoff + h + h / 2);       // S2
        this._pushSpaceData(SpaceType.RB, xoff - w / 2, yoff + h / 2, xoff - w / 2, yoff + h / 2);                     // S3
        this._pushSpaceData(SpaceType.LB, xoff + w / 2, yoff - h / 2, xoff + w / 2, yoff - h / 2);                     // S4
    }

    private _placeOtherWord(word: Word): void {
        for (let index = 0; index < this.spaceIdArray.length; index++) {
            const spaceId = this.spaceIdArray[index];
            const obj = this.spaceDataObject[spaceId];

            if (!obj) continue;

            let alignmentInd: AlignmentType | 0 = 0;
            let alignmentIndCount = 0;

            if (word.width <= obj.width && word.height <= obj.height) {
                alignmentInd = AlignmentType.HR;
                alignmentIndCount++;
            }

            if (this.options.verticalEnabled) {
                if (word.height <= obj.width && word.width <= obj.height) {
                    alignmentInd = AlignmentType.VR;
                    alignmentIndCount++;
                }
            }

            if (alignmentIndCount > 0) {
                this.spaceDataObject[spaceId] = null;
                this.spaceIdArray.splice(index, 1);

                // For Word's Span Position
                let xMul = 1;
                let yMul = 1;

                // For new Child Spaces
                let xMulS = 1;
                let yMulS = 1;

                switch (obj.spaceType) {
                    case SpaceType.LB:
                        xMul = 0;
                        yMul = -1;
                        xMulS = 1;
                        yMulS = -1;
                        break;
                    case SpaceType.LT:
                        xMul = 0;
                        yMul = 0;
                        xMulS = 1;
                        yMulS = 1;
                        break;
                    case SpaceType.RT:
                        xMul = -1;
                        yMul = 0;
                        xMulS = -1;
                        yMulS = 1;
                        break;
                    case SpaceType.RB:
                        xMul = -1;
                        yMul = -1;
                        xMulS = -1;
                        yMulS = -1;
                        break;
                }

                if (alignmentIndCount > 1) {
                    // Making Horizontal Word in Larger Number
                    // Random number[0,5] is >0 and <3 --> HR
                    // Random number[0,5] is >3 --> VR
                    if (Math.random() * 5 > 3) {
                        alignmentInd = AlignmentType.VR;
                    } else {
                        alignmentInd = AlignmentType.HR;
                    }
                }

                const w = word.width;
                const h = word.height;

                switch (alignmentInd) {
                    case AlignmentType.HR:
                        {
                            const span = word.span!;
                            $(span).css("left", obj.x + xMul * w)
                                .css("top", obj.y + yMul * h)
                                .css("display", "inline");
                            this.$target.append(span);

                            if (Math.random() * 2 > 1) {
                                this._pushSpaceData(obj.spaceType, obj.width - w, h, obj.x + xMulS * w, obj.y);          // R
                                this._pushSpaceData(obj.spaceType, obj.width, obj.height - h, obj.x, obj.y + yMulS * h); // T
                            } else {
                                this._pushSpaceData(obj.spaceType, obj.width - w, obj.height, obj.x + xMulS * w, obj.y); // R
                                this._pushSpaceData(obj.spaceType, w, obj.height - h, obj.x, obj.y + yMulS * h);          // T
                            }
                        }
                        break;

                    case AlignmentType.VR:
                        {
                            const span = word.span!;
                            // IE Handling for Different way of Rotation Transforms
                            const $span = $(span);
                            if (($ as any).browser && ($ as any).browser.msie) {
                                $span.css("left", obj.x + xMul * h)
                                    .css("top", obj.y + yMul * w);
                            } else {
                                $span.css("left", obj.x + xMul * h - (w - h) / 2)
                                    .css("top", obj.y + yMul * w + (w - h) / 2);
                            }

                            $span.css("display", "block")
                                .css("-webkit-transform", "rotate(270deg)")
                                .css("-moz-transform", "rotate(270deg)")
                                .css("-o-transform", "rotate(270deg)")
                                .css("filter", "progid:DXImageTransform.Microsoft.BasicImage(rotation=3)");
                            this.$target.append(span);

                            if (Math.random() * 2 > 1) {
                                this._pushSpaceData(obj.spaceType, obj.width - h, w, obj.x + xMulS * h, obj.y);          // R
                                this._pushSpaceData(obj.spaceType, obj.width, obj.height - w, obj.x, obj.y + yMulS * w); // T
                            } else {
                                this._pushSpaceData(obj.spaceType, obj.width - h, obj.height, obj.x + xMulS * h, obj.y); // R
                                this._pushSpaceData(obj.spaceType, h, obj.height - w, obj.x, obj.y + yMulS * w);          // T
                            }
                        }
                        break;
                }

                return;
            }
        }
    }
}

// jQuery plugin
(function ($: any) {
    $.fn.jQWCloud = function (options?: CloudOptions | string): JQuery {
        const wc = new WordCloud();
        wc._setTarget(this);
        wc._init(options);
        return this;
    };
})(jQuery);

// Type definitions for jQWCloud
interface WordInput {
    word: string;
    weight: number;
    color?: string;
    font_family?: string;
    word_class?: string;
}

interface CloudOptions {
    words: WordInput[];
    fontOffset?: number;
    showSpaceDIV?: boolean;
    verticalEnabled?: boolean;
    cloud_color?: string;
    cloud_font_family?: string;
    spaceDIVColor?: string;
    padding_left?: number;
    word_common_classes?: string;
    maxFont: number;
    minFont: number;
    beforeCloudRender?: () => void;
    afterCloudRender?: () => void;
}

interface JQuery {
    jQWCloud(options?: CloudOptions | string): JQuery;
}
