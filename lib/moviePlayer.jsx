'use strict';

import React from 'react';

export default class MoviePlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      characterTitle: props.settings.characterTitle,
      characterName: props.settings.characterName,
      characterImage: props.settings.characterImage,
      nameStandBy: true,
    };
    this._settingsChange = (key, value) => {
      this.setState({ [key]: value });
      this.props.onSettingsChange({ [key]: value });
    };
  }

  easeAlpha(time, inTime, outTime, easeTime) {
    if (time < inTime || time > outTime) return 0;
    let alpha = 1;
    if (time < inTime + easeTime) alpha = (time - inTime) / easeTime;
    if (time > outTime - easeTime) alpha = (outTime - time) / easeTime;
    return alpha;
  }

  drawSign(x, y, alpha = 1, scale = 1, compositeMode) {
    const {width, height} = this.refs.canvas;
    if (alpha <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    if (compositeMode) this.ctx.globalCompositeOperation = compositeMode;
    this.ctx.drawImage(this.props.image, x, y, width * scale, height * scale);
    this.ctx.restore();
  }

  drawCharacter(time) {
    const {width, height} = this.refs.canvas;
    const alpha = this.easeAlpha(time, 7, 20, 0);
    const image = this.state.characterImage;
    if (!image || alpha <= 0) return;
    const iw = image.width;
    const ih = image.height;
    const scale = (width / height > iw / ih) ? (width / iw) : (height / ih);
    const x = (width - iw * scale) / 2;
    const y = (height - ih * scale) / 2;
    this.ctx.drawImage(image, x, y, iw * scale, ih * scale);
  }

  draw() {
    if (!this.refs.video) return;
    window.requestAnimationFrame(this.draw.bind(this));
    if (this.refs.video.paused) return;
    const {width, height} = this.refs.canvas;
    const time = this.refs.video.currentTime;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.globalCompositeOperation = 'lighter';
    // main video
    this.ctx.drawImage(this.refs.video, 0, 0, width, height);
    // main sign, displayed largely on center
    this.drawSign(0, 0, this.easeAlpha(time, 4.5, 7.1, 0.7), 1);
    // pasted character image
    this.drawCharacter(time);
    // small sign, displayed with the character
    this.drawSign(0, 200, this.easeAlpha(time, 10, 20, 1), 0.5, 'source-over');
    // black sign, displayed for a moment on the whiteout screen
    this.drawSign(0, 0, this.easeAlpha(time, 6.5, 7, 0.5), 1, 'difference');
    const nameStandBy = time < 10;
    if (this.state.nameStandBy != nameStandBy) this.setState({ nameStandBy });
  }

  characterLoad(event) {
    const img = new Image();
    img.src = event.target.result;
    this._settingsChange('characterImage', img);
  }

  paste(event) {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = this.characterLoad.bind(this);
        reader.readAsDataURL(blob);
        break;
      }
    }
  }

  componentDidMount() {
    this.ctx = this.refs.canvas.getContext('2d');
    this.boundPaste = this.paste.bind(this);
    window.addEventListener('paste', this.boundPaste);
    window.requestAnimationFrame(this.draw.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener('paste', this.boundPaste);
  }

  rewindButtonClick() {
    this.refs.video.currentTime = 0;
    this.refs.video.play();
  }

  fileSelect() {
    const file = this.refs.file.files[0];
    if (file) {
      const reader  = new FileReader();
      reader.onloadend = this.characterLoad.bind(this);
      reader.readAsDataURL(file);
    } else {
      this._onSettingsChange('characterImage', null);
    }
  }

  render() {
    return (
      <div>
        <h3>演出を鑑賞</h3>
        <div className="sign-video-container">
          <canvas ref="canvas" width="720" height="405"/>
          <video ref="video" src="ssr_drawn.mp4" autoPlay/>
          <CharacterNameFrame title={this.state.characterTitle}
                              name={this.state.characterName}
                              type={this.props.settings.pencilColor}
                              standBy={this.state.nameStandBy}/>
        </div>
        <div className="controls">
          <button onClick={this.rewindButtonClick.bind(this)}>
            最初から
          </button>
          &ensp;
          [<input type="text"
                  placeholder="肩書き"
                  value={this.state.characterTitle}
                  onChange={(ev) => this._settingsChange('characterTitle', ev.target.value)} />]
          &ensp;
          <input type="text"
                 placeholder="名前"
                 value={this.state.characterName}
                 onChange={(ev) => this._settingsChange('characterName', ev.target.value)} />
        </div>
        <div className="controls">
          <input type="file"
                 ref="file"
                 onChange={this.fileSelect.bind(this)}/>
          <button onClick={() => this.refs.file.click()}>キャラ画像を登録</button>&ensp;
          <small>画像はブラウザ内のみで処理され、外部にアップロードはされません。</small>
        </div>
      </div>
    );
  }
}

MoviePlayer.propTypes = {
  image: React.PropTypes.instanceOf(Image).isRequired,
  settings: React.PropTypes.object.isRequired,
  onSettingsChange: React.PropTypes.func.isRequired,
};

class CharacterNameFrame extends React.Component {
  static getFillColors() {
    return {
      cute: ['#ff7abd', '#ff1a8c'],
      cool: ['#59b4de', '#2180de'],
      passion: ['#ffaa00', '#fe7700'],
    };
  }

  render() {
    const classNames = ['character-frame', this.props.type];
    const fillColors = CharacterNameFrame.getFillColors()[this.props.type];
    if (this.props.standBy) classNames.push('stand-by');
    return (
      <div className={classNames.join(' ')}>
        <svg width="100%" height="100%">
          <defs>
            <linearGradient id="grad" gradientTransform="rotate(90)">
              <stop offset="0" stopColor={fillColors[0]} />
              <stop offset="1" stopColor={fillColors[1]} />
            </linearGradient>
            <filter id="filt">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="4" dy="4" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g stroke="white" strokeWidth="8" fontFamily="sans-serif" fontWeight="bold"
             fill="white" filter="url(#filt)" strokeLinejoin="round">
            <text fontSize="42px" x="320px" y="85px" textAnchor="left">[{this.props.title}]</text>
            <text fontSize="90px" x="400px" y="190px" textAnchor="middle">{this.props.name}</text>
          </g>
          <g fill="url(#grad)" fontFamily="sans-serif" fontWeight="bold">
            <text fontSize="42px" x="320px" y="85px" textAnchor="left">[{this.props.title}]</text>
            <text fontSize="90px" x="400px" y="190px" textAnchor="middle">{this.props.name}</text>
          </g>
        </svg>
      </div>
    );
  }
}
