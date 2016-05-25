'use strict';

// The drawing algorithm is inspired by
// http://perfectionkills.com/exploring-canvas-drawing-techniques/

import 'babel-polyfill';
import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';

const ASSETS = {
  PENCIL_1: 'pencil_1.png',
  CUTE_BG: 'cute_bg.png',
  PASSION_BG: 'passion_bg.png',
  COOL_BG: 'cool_bg.png',
  BG: 'bg.png',
  ORB: 'orb.png',
  FLARE: 'flare.png',
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

function imageToCanvas(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img);
    resolve(canvas);
  });

}

function imageToImageData(img) {
  return new Promise((resolve, reject) => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.drawImage(img, 0, 0);
    resolve(ctx.getImageData(0, 0, img.width, img.height));
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

class Layer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ctx: null,
      commandQueue: [],
      runningCommand: null,
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

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.command && nextProps.command !== this.props.command) {
      this.setState({
        commandQueue: this.state.commandQueue.concat([nextProps.command]),
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    //console.log(this.state.commandQueue, this.state.runningCommand);
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
    return (
      <div className="canvas__wrapper"
           style={{position: 'relative', width: '1280px', height: '720px'}}>
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.BG, 0, 0) }}
               visible={this.props.settings.showBG}
               />
        <Layer command={this.state.bottomLayerCommand} />
        <Layer command={this.state.topShadowLayerCommand} />
        <Layer command={this.state.topLayerCommand} />
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.ORB, 0, 0) }}
               visible={this.props.settings.showOrb}
               />
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.FLARE, 0, 0) }}
               visible={this.props.settings.showFlare}
               />
        <div className="canvas__mouse-tracker"
             style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
             onMouseDown={this._onCanvasMouseDown.bind(this)}
             onMouseMove={this._onCanvasMouseMove.bind(this)}
             onMouseUp={this._onCanvasMouseUp.bind(this)}
             onMouseLeave={this._onCanvasMouseUp.bind(this)}
             onTouchStart={this._onCanvasMouseDown.bind(this)}
             onTouchMove={this._onCanvasMouseMove.bind(this)}
             onTouchEnd={this._onCanvasMouseUp.bind(this)}
             >
        </div>
      </div>
    );
  }

  getPencilBG(name) {
    return (name === 'cute') ? this.props.assets.CUTE_BG :
           (name === 'cool') ? this.props.assets.COOL_BG :
           (name === 'passion') ? this.props.assets.PASSION_BG :
           null;
  }

  _onCanvasMouseDown(e) {
    this.setState({
      mousePos: {x: e.clientX, y: e.clientY},
    });
  }

  _onCanvasMouseMove(e) {
    const currentPoint = {x: e.clientX, y: e.clientY};

    if (this.state.mousePos) {
      const lastPoint = {x: this.state.mousePos.x, y: this.state.mousePos.y};
      const pencilBG = this.getPencilBG.bind(this)(this.props.settings.pencilColor);

      if (currentPoint.x === lastPoint.x && currentPoint.y === lastPoint.y) {
        return;
      }

      const topLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.topLayerPencilSize, this.state.topLayerPencilSize);
          resolve(ctx);
        });

      const topShadowLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.topLayerPencilSize, this.state.topLayerPencilSize);
          resolve(ctx);
        });

      const bottomLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.bottomLayerPencilSize, this.state.bottomLayerPencilSize);

          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(pencilBG, 0, 0);
          resolve(ctx);
        });

      const eraserCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'destination-out';
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.bottomLayerPencilSize, this.state.bottomLayerPencilSize);
          resolve(ctx);
        });

      this.setState({
        topLayerCommand: !this.props.settings.enableTopLayer ? null :
                         this.props.settings.drawMode === 'eraser' ? eraserCommand :
                         topLayerCommand,
        topShadowLayerCommand: !this.props.settings.enableTopLayer ? null :
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
          SSR Generator
        </div>
        <div className="sidebar__section">
          <button onClick={this.props.onFullscreenButtonClick}>
            {this.props.fullscreen? '全画面を中止' : '全画面で編集'}
          </button>
        </div>
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
        </ul>
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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: {
        drawMode: 'pencil',
        pencilColor: 'cute',
        enableTopLayer: true,
        enableBottomLayer: true,
        showBG: true,
        showOrb: true,
        showFlare: true,
      },
      fullscreen: false,
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
  }

  render() {
    return (
      <div className="app"
           ref="app">
        <div style={{position: 'relative'}}>
          <Canvas assets={this.props.assets}
                  settings={this.state.settings}
                  />
          <div style={{position: 'absolute', bottom: 0, right: 0}}>
            <button className={`app__pencil ${this.state.settings.drawMode === 'pencil'? '' : 'disabled'}`}
                    onClick={(() => this._onSettingsChange({drawMode: 'pencil'})).bind(this)}
                    >
              P
            </button>
            <button className={`app__eraser ${this.state.settings.drawMode === 'eraser'? '' : 'disabled'}`}
                    onClick={(() => this._onSettingsChange({drawMode: 'eraser'})).bind(this)}
                    >
              E
            </button>
          </div>
        </div>
        <Sidebar settings={this.state.settings}
                 fullscreen={this.state.fullscreen}
                 onSettingsChange={this._onSettingsChange.bind(this)}
                 onFullscreenButtonClick={this._onFullscreenButtonClick.bind(this)}
                 />
      </div>
    );
  }

  _onSettingsChange(changes) {
    this.setState({
      settings: Object.assign({}, this.state.settings, changes),
    });
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
}

co(function *() {
  const assets = {
    PENCIL_1:   yield fetchAsset(ASSETS.PENCIL_1),
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
