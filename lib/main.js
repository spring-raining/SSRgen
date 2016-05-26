'use strict';

// The drawing algorithm is inspired by
// http://perfectionkills.com/exploring-canvas-drawing-techniques/

import 'babel-polyfill';
import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';
import {TwitterButton, FacebookButton, FacebookCount, GooglePlusButton, GooglePlusCount} from 'react-social';

import packageJson from './../package.json';

const ASSETS = {
  PENCIL_1: 'pencil_1.png',
  PENCIL_2: 'pencil_2.png',
  PENCIL_3: 'pencil_1.png',
  CUTE_BG: 'cute_bg.png',
  PASSION_BG: 'passion_bg.png',
  COOL_BG: 'cool_bg.png',
  BG: 'bg.png',
  ORB: 'orb.png',
  FLARE: 'flare.png',
};

const PENCIL_SIZE = {
  PENCIL_1: {
    top:      [8, 8],
    bottom:   [24, 24],
  },
  PENCIL_2: {
    top:      [14, 10],
    bottom:   [24, 36],
  },
  PENCIL_3: {
    top:      [4, 4],
    bottom:   [20, 20],
  },
};

function fetchAsset(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.src = path;
  });
}

function calcDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function calcAngle(p1, p2) {
  return Math.atan2(p2.x - p1.x, p2.y - p1.y);
}

function draw(ctx, pencil, p1, p2, dw = null, dh = null) {
  const distance = calcDistance(p1, p2);
  const angle = calcAngle(p1, p2);
  const _dw = dw || pencil.width;
  const _dh = dh || pencil.height;
  for (let i = 0; i < distance; i++) {
    ctx.drawImage(
      pencil,
      p1.x + (Math.sin(angle) * i) - _dw / 2,
      p1.y + (Math.cos(angle) * i) - _dh / 2,
      _dw,
      _dh);
  }
}

function canvasToObjectURL(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      const objectURL = window.URL.createObjectURL(blob);
      resolve(objectURL);
    });
  });
}

class Layer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ctx: null,
      commandQueue: [],
      runningCommand: null,
      undoBuffer: null,
      swapBuffer: null
    };
  }

  componentDidMount() {
    const canvasDOM = ReactDOM.findDOMNode(this.refs.canvas);
    const ctx = canvasDOM.getContext('2d');

    this.setState({
      ctx: ctx,
    });

    if (this.props.initialize) {
      //this.props.initialize(ctx);
      setTimeout(() => this.props.initialize(ctx), 0);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.command && nextProps.command !== this.props.command) {
      this.setState({
        commandQueue: this.state.commandQueue.concat([nextProps.command]),
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.commandQueue.length > 0 && !this.state.runningCommand) {
      this.setState({
        commandQueue: this.state.commandQueue.slice(1),
        runningCommand: this.state.commandQueue[0],
      });
    }
    if (this.state.runningCommand) {
      co(function *() {
        yield this.state.runningCommand(this.state.ctx);
        this.setState({
          runningCommand: null,
        });
      }.bind(this));
    }
  }

  render() {
    return (
      <canvas ref="canvas"
              width="1280"
              height="720"
              style={{
                position: 'absolute',
                opacity: this.props.visible? 1 : 0,
              }}
              />
    );
  }

  getCanvas() {
    return ReactDOM.findDOMNode(this.refs.canvas);
  }

  saveUndoBuffer() {
    let undoBuffer;
    if (!this.state.undoBuffer) {
      undoBuffer = document.createElement('canvas');
      undoBuffer.width = 1280;
      undoBuffer.height = 720;
      this.setState({
        undoBuffer: undoBuffer
      });
    }
    else {
      undoBuffer = this.state.undoBuffer;
    }
    const undoCtx = undoBuffer.getContext('2d');
    undoCtx.globalCompositeOperation = "source-over";
    undoCtx.shadowBlur = 0;
    undoCtx.clearRect(0, 0, 1280, 720);
    undoCtx.drawImage(this.getCanvas(), 0, 0);
  }

  retrieveUndoBuffer() {
    this.state.ctx.globalCompositeOperation = "source-over";
    this.state.ctx.shadowBlur = 0;
    this.state.ctx.clearRect(0, 0, 1280, 720);
    if (this.state.undoBuffer) {
      this.state.ctx.drawImage(this.state.undoBuffer, 0, 0);
    }
  }

  swapUndoBuffer() {
    let undoBuffer;
    if (!this.state.undoBuffer) {
      undoBuffer = document.createElement('canvas');
      undoBuffer.width = 1280;
      undoBuffer.height = 720;
      this.setState({
        undoBuffer: undoBuffer
      });
    }
    else {
      undoBuffer = this.state.undoBuffer;
    }
    let swapBuffer;
    if (!this.state.swapBuffer) {
      swapBuffer = document.createElement('canvas');
      swapBuffer.width = 1280;
      swapBuffer.height = 720;
      this.setState({
        swapBuffer: swapBuffer
      });
    }
    else {
      swapBuffer = this.state.swapBuffer;
    }
    const undoCtx = undoBuffer.getContext('2d');
    const swapCtx = swapBuffer.getContext('2d');
    swapCtx.globalCompositeOperation = "source-over";
    swapCtx.shadowBlur = 0;
    swapCtx.clearRect(0, 0, 1280, 720);
    swapCtx.drawImage(this.getCanvas(), 0, 0);
    this.state.ctx.globalCompositeOperation = "source-over";
    this.state.ctx.shadowBlur = 0;
    this.state.ctx.clearRect(0, 0, 1280, 720);
    this.state.ctx.drawImage(undoBuffer, 0, 0);
    undoCtx.globalCompositeOperation = "source-over";
    undoCtx.shadowBlur = 0;
    undoCtx.clearRect(0, 0, 1280, 720);
    undoCtx.drawImage(swapBuffer, 0, 0);
  }
}
Layer.propTypes = {
  initialize: React.PropTypes.func,
  command: React.PropTypes.func,
  visible: React.PropTypes.bool.isRequired,
};
Layer.defaultProps = {
  initialize: null,
  command: null,
  visible: true,
};

class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mousePos: null,
      topLayerCommand: null,
      topLayerPencilSize: 8,
      topShadowLayerCommand: null,
      bottomLayerCommand: null,
      bottomLayerPencilSize: 20,
    };
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.settings.pencilColor !== this.props.settings.pencilColor) {
      const pencilBG = this.getPencilBG.bind(this)(nextProps.settings.pencilColor);
      this.setState({
        bottomLayerCommand: (ctx) =>
          new Promise((resolve) => {
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(pencilBG, 0, 0);
            resolve(ctx);
          }),
      });
    }
  }

  render() {
    const scale = Math.min(
      this.props.windowWidth / 1280,
      this.props.windowHeight / 720
    );
    const positionX = (this.props.windowWidth - 1280) / 2;
    const positionY = (this.props.windowHeight - 720) / 2;

    return (
      <div className="canvas__wrapper"
           style={{width: '1280px',
                   height: '720px',
                   transform: `translate3d(${positionX}px, ${positionY}px, 0) scale(${scale})`
           }}>
        <Layer ref="BG"
               initialize={(ctx) => { ctx.drawImage(this.props.assets.BG, 0, 0) }}
               visible={this.props.settings.showBG}
               />
        <Layer ref="bottom"
               command={this.state.bottomLayerCommand} />
        <Layer ref="topShadow"
               command={this.state.topShadowLayerCommand} />
        <Layer ref="top"
               command={this.state.topLayerCommand} />
        <Layer ref="orb"
               initialize={(ctx) => { ctx.drawImage(this.props.assets.ORB, 0, 0) }}
               visible={this.props.settings.showOrb}
               />
        <Layer ref="flare"
               initialize={(ctx) => { ctx.drawImage(this.props.assets.FLARE, 0, 0) }}
               visible={this.props.settings.showFlare}
               />
        <div className="canvas__mouse-tracker"
             style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
             onMouseDown={this._onCanvasMouseDown.bind(this)}
             onMouseMove={this._onCanvasMouseMove.bind(this)}
             onMouseUp={this._onCanvasMouseUp.bind(this)}
             onMouseLeave={this._onCanvasMouseUp.bind(this)}
             onTouchStart={this._onCanvasTouchStart.bind(this)}
             onTouchMove={this._onCanvasTouchMove.bind(this)}
             onTouchEnd={this._onCanvasTouchEnd.bind(this)}
             >
        </div>
      </div>
    );
  }

  getPoint(e) {
    const scale = Math.min(
      this.props.windowWidth / 1280,
      this.props.windowHeight / 720
    );
    const offsetX = (this.props.windowWidth - 1280 * scale) / 2;
    const offsetY = (this.props.windowHeight - 720 * scale) / 2;

    return {
      x: (e.clientX - offsetX) / scale,
      y: (e.clientY - offsetY) / scale,
    }
  }

  getPencilBG(name) {
    return (name === 'cute') ? this.props.assets.CUTE_BG :
           (name === 'cool') ? this.props.assets.COOL_BG :
           (name === 'passion') ? this.props.assets.PASSION_BG :
           null;
  }

  generate() {
    return co(function *() {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';

      if (this.props.settings.showBG) {
        ctx.drawImage(this.refs.BG.getCanvas(), 0, 0);
      }
      ctx.drawImage(this.refs.bottom.getCanvas(), 0, 0);
      ctx.drawImage(this.refs.topShadow.getCanvas(), 0, 0);
      ctx.drawImage(this.refs.top.getCanvas(), 0, 0);
      if (this.props.settings.showOrb) {
        ctx.drawImage(this.refs.orb.getCanvas(), 0, 0);
      }
      if (this.props.settings.showFlare) {
        ctx.drawImage(this.refs.flare.getCanvas(), 0, 0);
      }
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`SSRサインジェネレータ ${packageJson.homepage}`, 10, 700);
      return canvas;
    }.bind(this));
  }

  saveUndoBuffer() {
    this.refs.top.saveUndoBuffer();
    this.refs.topShadow.saveUndoBuffer();
    this.refs.bottom.saveUndoBuffer();
  }

  retrieveUndoBuffer() {
    this.refs.top.retrieveUndoBuffer();
    this.refs.topShadow.retrieveUndoBuffer();
    this.refs.bottom.retrieveUndoBuffer();
    const pencilBG = this.getPencilBG(this.props.settings.pencilColor);
    this.setState({
      bottomLayerCommand: (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(pencilBG, 0, 0);
          resolve(ctx);
        }),
    });
  }

  swapUndoBuffer() {
    this.refs.top.swapUndoBuffer();
    this.refs.topShadow.swapUndoBuffer();
    this.refs.bottom.swapUndoBuffer();
    const pencilBG = this.getPencilBG(this.props.settings.pencilColor);
    this.setState({
      bottomLayerCommand: (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(pencilBG, 0, 0);
          resolve(ctx);
        }),
    });
  }

  _onCanvasMouseDown(e) {
    this.saveUndoBuffer();
    this.setState({
      mousePos: this.getPoint.bind(this)(e),
    });
  }

  _onCanvasMouseMove(e) {
    const currentPoint = this.getPoint.bind(this)(e);

    if (this.state.mousePos) {
      const lastPoint = {x: this.state.mousePos.x, y: this.state.mousePos.y};
      const pencil = this.props.assets[this.props.settings.pencilType];
      const pencilSize = PENCIL_SIZE[this.props.settings.pencilType];
      const pencilBG = this.getPencilBG.bind(this)(this.props.settings.pencilColor);

      if (currentPoint.x === lastPoint.x && currentPoint.y === lastPoint.y) {
        return;
      }

      const topLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          draw(ctx, pencil, lastPoint, currentPoint, pencilSize.top[0], pencilSize.top[1]);
          resolve(ctx);
        });

      const topShadowLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          draw(ctx, pencil, lastPoint, currentPoint, pencilSize.top[0], pencilSize.top[1]);
          resolve(ctx);
        });

      const bottomLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          draw(ctx, pencil, lastPoint, currentPoint, pencilSize.bottom[0], pencilSize.bottom[1]);

          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(pencilBG, 0, 0);
          resolve(ctx);
        });

      const eraserCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'destination-out';
          draw(ctx, pencil, lastPoint, currentPoint, pencilSize.bottom[0] * 2, pencilSize.bottom[1] * 2);
          resolve(ctx);
        });

      this.setState({
        topLayerCommand: !this.props.settings.enableTopLayer ? null :
                         this.props.settings.drawMode === 'eraser' ? eraserCommand :
                         topLayerCommand,
        topShadowLayerCommand: !this.props.settings.enableTopLayer ? null :
                               this.props.settings.lightMode ? null :
                               this.props.settings.drawMode === 'eraser' ? eraserCommand :
                               topShadowLayerCommand,
        bottomLayerCommand: !this.props.settings.enableBottomLayer ? null :
                            this.props.settings.drawMode === 'eraser' ? eraserCommand :
                            bottomLayerCommand,
        mousePos: currentPoint,
      });
    }
  }

  _onCanvasMouseUp(e) {
    this.setState({
      mousePos: null,
      topLayerCommand: null,
      bottomLayerCommand: null,
    });
  }

  _onCanvasTouchStart(e) {
    const touch = e.changedTouches[0];
    this._onCanvasMouseDown.bind(this)({
      clientX: touch.pageX,
      clientY: touch.pageY,
    });
  }

  _onCanvasTouchMove(e) {
    const touch = e.changedTouches[0];
    this._onCanvasMouseMove.bind(this)({
      clientX: touch.pageX,
      clientY: touch.pageY,
    });
  }

  _onCanvasTouchEnd(e) {
    const touch = e.changedTouches[0];
    this._onCanvasMouseUp.bind(this)({
      clientX: touch.pageX,
      clientY: touch.pageY,
    });
  }
}

class Sidebar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hidden: true,
    };
  }

  render() {
    return (
      <div className={`sidebar ${this.state.hidden? 'hidden' : ''}`}>
        <div className="sidebar__switch"
             onClick={this._onSwitchClick.bind(this)}>
          SSRサインジェネレータ
        </div>
        <div className="sidebar__content">
          <div className="sidebar__section">
            <button onClick={this.props.onGenerateButtonClick}>
              画像を作成
            </button>
          </div>
          <div className="sidebar__section">
            <button onClick={this.props.onFullscreenButtonClick}>
              {this.props.fullscreen? '全画面を中止' : '全画面で編集'}
            </button>
          </div>
          <div className="sidebar__section">
            <button onClick={this.props.onUndoButtonClick}>
              元に戻す/やり直し
            </button>
          </div>
          <div className="sidebar__section">ペンの種類</div>
          <ul className="sidebar__choice">
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilType === 'PENCIL_1'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilType: 'PENCIL_1'})}
                />
                ペン1
              </li>
            </label>
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilType === 'PENCIL_2'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilType: 'PENCIL_2'})}
                />
                ペン2
              </li>
            </label>
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilType === 'PENCIL_3'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilType: 'PENCIL_3'})}
                />
                ペン3
              </li>
            </label>
          </ul>
          <div className="sidebar__section">ペン色</div>
          <ul className="sidebar__choice">
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilColor === 'cute'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilColor: 'cute'})}
                       />
                キュート
              </li>
            </label>
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilColor === 'cool'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilColor: 'cool'})}
                       />
                クール
              </li>
            </label>
            <label>
              <li>
                <input type="radio"
                       checked={this.props.settings.pencilColor === 'passion'}
                       onChange={this._onSettingsChangeClick.bind(this)({pencilColor: 'passion'})}
                       />
                パッション
              </li>
            </label>
          </ul>
          <div className="sidebar__section">ペンレイヤー</div>
          <ul className="sidebar__choice">
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.enableTopLayer}
                       onChange={this._onSettingsChangeClick({enableTopLayer: !this.props.settings.enableTopLayer})}
                       />
                前面を描く
              </li>
            </label>
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.enableBottomLayer}
                       onChange={this._onSettingsChangeClick({enableBottomLayer: !this.props.settings.enableBottomLayer})}
                       />
                背面を描く
              </li>
            </label>
          </ul>
          <div className="sidebar__section">エフェクト</div>
          <ul className="sidebar__choice">
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.showBG}
                       onChange={this._onSettingsChangeClick.bind(this)({showBG: !this.props.settings.showBG})}
                       />
                背景を表示
              </li>
            </label>
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.showOrb}
                       onChange={this._onSettingsChangeClick.bind(this)({showOrb: !this.props.settings.showOrb})}
                       />
                オーブを表示
              </li>
            </label>
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.showFlare}
                       onChange={this._onSettingsChangeClick.bind(this)({showFlare: !this.props.settings.showFlare})}
                />
                フレアを表示
              </li>
            </label>
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.lightMode}
                       onChange={this._onSettingsChangeClick.bind(this)({lightMode: !this.props.settings.lightMode})}
                />
                軽量モード
                <div className="sidebar__footnote">
                  スマホなどで動作が重いときに使ってください
                </div>
              </li>
            </label>
          </ul>
          <div className="sidebar__section sidebar__footnote">
            <div className="sidebar__share">
              <div>
                <TwitterButton className="share-button twitter"
                               url={packageJson.homepage}
                               message={packageJson.description}>
                  <i className="fa fa-twitter" aria-hidden="true"></i>
                </TwitterButton>
              </div>
              <div>
                <FacebookButton className="share-button facebook"
                                url={packageJson.homepage}
                                message={packageJson.description}>
                  <i className="fa fa-facebook" aria-hidden="true"></i>
                </FacebookButton>
                <FacebookCount className="share-count facebook"
                               url={packageJson.homepage} />
              </div>
              <div>
                <GooglePlusButton className="share-button google-plus" url={packageJson.homepage}
                                  message={packageJson.description}>
                  <i className="fa fa-google-plus" aria-hidden="true"></i>
                </GooglePlusButton>
                <GooglePlusCount className="share-count google-plus"
                                 url={packageJson.homepage} />
              </div>
            </div>
            <p>
              v{packageJson.version} <br/>
              ご意見・ご要望は#SSR_generatorでエゴサします
            </p>
            <p>
              <a href="https://twitter.com/spring_raining">© spring_raining</a> <br/>
              <a href="https://github.com/spring-raining/SSRgen">GitHub</a> <br/>
              <a href="http://harusamex.com">harusamex.com</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  _onSwitchClick() {
    this.setState({
      hidden: !this.state.hidden,
    });
  }

  _onSettingsChangeClick(changes) {
    return () => this.props.onSettingsChange(changes);
  }
}

class Modal extends React.Component {
  render() {
    return (
      <div className={`modal-bg ${this.props.className}`}
           onClick={this.props.onCloseButtonClick}
           >
        <div className="modal"
             onClick={(e) => e.stopPropagation()}>
          {this.props.children}
          <button className="modal-close"
               onClick={this.props.onCloseButtonClick}
               >
            ×
          </button>
        </div>
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: {
        drawMode: 'pencil',
        pencilType: 'PENCIL_1',
        pencilColor: 'cute',
        enableTopLayer: true,
        enableBottomLayer: true,
        showBG: true,
        showOrb: true,
        showFlare: true,
        lightMode: false,
      },
      windowWidth: 1280,
      windowHeight: 720,
      fullscreen: false,
      modal: null,
    };
  }

  componentDidMount() {
    const appDOM = ReactDOM.findDOMNode(this.refs.app);
    const fullscreenChangeEvent = ((e) => {
      this.setState({
        fullscreen: !this.state.fullscreen,
      });
    }).bind(this);

    appDOM.addEventListener('fullscreenchange', fullscreenChangeEvent);
    appDOM.addEventListener('webkitfullscreenchange', fullscreenChangeEvent);
    appDOM.addEventListener('mozfullscreenchange', fullscreenChangeEvent);
    appDOM.addEventListener('MSFullscreenChange', fullscreenChangeEvent);

    window.addEventListener('resize', (e) => {
      this.setState({
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
    });

    this.setState({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
  }

  render() {
    return (
      <div className="app"
           ref="app"
           style={{width: `${this.state.windowWidth}px`, height: `${this.state.windowHeight}px`}}
           >
        <div style={{width: '100%', height: '100%'}}>
          <Canvas ref="canvas"
                  assets={this.props.assets}
                  settings={this.state.settings}
                  windowWidth={this.state.windowWidth}
                  windowHeight={this.state.windowHeight}
                  />
          <div style={{position: 'absolute', bottom: '12px', right: '12px'}}>
            <button className={`app__pencil ${this.state.settings.drawMode === 'pencil'? '' : 'disabled'}`}
                    onClick={(() => this._onSettingsChange({drawMode: 'pencil'})).bind(this)}
                    >
              <i className="fa fa-pencil" aria-hidden="true"></i>
            </button>
            <button className={`app__eraser ${this.state.settings.drawMode === 'eraser'? '' : 'disabled'}`}
                    onClick={(() => this._onSettingsChange({drawMode: 'eraser'})).bind(this)}
                    >
              <i className="fa fa-eraser" aria-hidden="true"></i>

            </button>
          </div>
        </div>
        <Sidebar settings={this.state.settings}
                 fullscreen={this.state.fullscreen}
                 onSettingsChange={this._onSettingsChange.bind(this)}
                 onGenerateButtonClick={this._onGenerateButtonClick.bind(this)}
                 onFullscreenButtonClick={this._onFullscreenButtonClick.bind(this)}
                 onUndoButtonClick={this._onUndoButtonClick.bind(this)}
                 />
        {this.state.modal}
      </div>
    );
  }

  popupSaveModal(objectURL) {
    const modal = (
      <Modal className="save-modal"
             onCloseButtonClick={this._onCloseButtonClick.bind(this)}>
        <h3>作成完了</h3>
        <img className="save-modal__img"
             src={objectURL}
             alt="SSR_sign"/>
        <a href={objectURL} download="SSR_sign.png">
          <button>画像をダウンロード</button>
        </a>
        <p>
          ボタンを押してもダウンロードできないときは、上の画像を右クリックやロングタップで直接保存することもできます。
        </p>
      </Modal>
    );
    this.setState({
      modal: modal,
    });
  }

  _onSettingsChange(changes) {
    this.setState({
      settings: Object.assign({}, this.state.settings, changes),
    });
  }

  _onGenerateButtonClick() {
    co(function *() {
      const canvas = yield this.refs.canvas.generate();
      const objectURL = yield canvasToObjectURL(canvas);
      this.popupSaveModal.bind(this)(objectURL);
    }.bind(this));
  }

  _onFullscreenButtonClick() {
    if (!this.state.fullscreen) {
      const app = ReactDOM.findDOMNode(this.refs.app);
      if (app.reqestFullscreen) {
        app.requestFullscreen();
      }
      else if (app.webkitRequestFullscreen) {
        app.webkitRequestFullscreen();
      }
      else if (app.mozRequestFullScreen) {
        app.mozRequestFullScreen();
      }
      else if (app.msRequestFullscreen) {
        app.msRequestFullscreen();
      }
    }
    else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      else if (document.cancelFullScreen) {
        document.cancelFullScreen();
      }
      else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
      else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      else if (document.msExitFullscreen) {
        document.msExitFullScreen();
      }
    }
  }

  _onUndoButtonClick() {
    this.refs.canvas.swapUndoBuffer();
  }

  _onCloseButtonClick() {
    this.setState({
      modal: null,
    });
  }
}

co(function *() {
  const assets = {
    PENCIL_1:   yield fetchAsset(ASSETS.PENCIL_1),
    PENCIL_2:   yield fetchAsset(ASSETS.PENCIL_2),
    PENCIL_3:   yield fetchAsset(ASSETS.PENCIL_3),
    CUTE_BG:    yield fetchAsset(ASSETS.CUTE_BG),
    PASSION_BG: yield fetchAsset(ASSETS.PASSION_BG),
    COOL_BG:    yield fetchAsset(ASSETS.COOL_BG),
    BG:         yield fetchAsset(ASSETS.BG),
    ORB:        yield fetchAsset(ASSETS.ORB),
    FLARE:      yield fetchAsset(ASSETS.FLARE),
  };

  ReactDOM.render(
    <App assets={assets} />,
    document.getElementById('renderpoint')
  );
});
