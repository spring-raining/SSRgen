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

  componentDidUpdate() {
    //console.log(this.state.commandQueue, this.state.runningCommand);
    if (this.state.runningCommand) {
      co(function *() {
        this.state.runningCommand(this.state.ctx);
      }.bind(this)).then((() => {
        this.setState({
          runningCommand: null,
        });
      }).bind(this));
    }
    if (this.state.commandQueue.length > 0 && !this.state.runningCommand) {
      this.setState({
        commandQueue: this.state.commandQueue.slice(1),
        runningCommand: this.state.commandQueue[0],
      });
    }
  }

  render() {
    return (
      <canvas ref="canvas"
              width="1280"
              height="720"
              style={{position: 'absolute'}}
              />
    );
  }
}
Layer.propTypes = {
  initialize: React.PropTypes.func,
  command: React.PropTypes.func,
};
Layer.defaultProps = {
  initialize: null,
  command: null,
};

class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mousePos: null,
      topLayerCommand: null,
      topLayerPencilSize: 8,
      bottomLayerCommand: null,
      bottomLayerPencilSize: 20,
    };
  }

  render() {
    return (
      <div className="canvas-wrapper"
           style={{position: 'relative', width: '1280px', height: '720px'}}>
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.BG, 0, 0) }} />
        <Layer command={this.state.bottomLayerCommand} />
        <Layer command={this.state.topLayerCommand} />
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.ORB, 0, 0) }} />
        <Layer initialize={(ctx) => { ctx.drawImage(this.props.assets.FLARE, 0, 0) }} />
        <div class="canvas-event-handler"
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

  _onCanvasMouseDown(e) {
    this.setState({
      mousePos: {x: e.clientX, y: e.clientY},
    });
  }

  _onCanvasMouseMove(e) {
    const currentPoint = {x: e.clientX, y: e.clientY};

    if (this.state.mousePos) {
      const lastPoint = {x: this.state.mousePos.x, y: this.state.mousePos.y};

      this.setState({
        topLayerCommand: (ctx) => {
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.topLayerPencilSize, this.state.topLayerPencilSize);
        },
        bottomLayerCommand: (ctx) => {
          ctx.globalCompositeOperation = 'source-over';
          draw(ctx, this.props.assets.PENCIL_1, lastPoint, currentPoint,
            this.state.bottomLayerPencilSize, this.state.bottomLayerPencilSize);
          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(this.props.assets.CUTE_BG, 0, 0);
        },
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
        <div className="sidebar__section">ペン色</div>
        <ul className="sidebar__choice">
          <li onClick={this._onSettingsChangeClick({pencilColor: 'cute'})}>
            <input type="radio" checked={this.props.settings.pencilColor === 'cute'}/>
            キュート
          </li>
          <li onClick={this._onSettingsChangeClick({pencilColor: 'cool'})}>
            <input type="radio" checked={this.props.settings.pencilColor === 'cool'}/>
            クール
          </li>
          <li onClick={this._onSettingsChangeClick({pencilColor: 'passion'})}>
            <input type="radio" checked={this.props.settings.pencilColor === 'passion'}/>
            パッション
          </li>
        </ul>
        <div className="sidebar__section">ペンレイヤー</div>
        <ul className="sidebar__choice">
          <li onClick={this._onSettingsChangeClick({enableTopLayer: !this.props.settings.enableTopLayer})}>
            <input type="checkbox" checked={this.props.settings.enableTopLayer}/>
            前面を描く
          </li>
          <li onClick={this._onSettingsChangeClick({enableBottomLayer: !this.props.settings.enableBottomLayer})}>
            <input type="checkbox" checked={this.props.settings.enableBottomLayer}/>
            背面を描く
          </li>
        </ul>
        <div className="sidebar__section">エフェクト</div>
        <ul className="sidebar__choice">
          <li onClick={this._onSettingsChangeClick({showBG: !this.props.settings.showBG})}>
            <input type="checkbox" checked={this.props.settings.showBG}/>
            背景を表示
          </li>
          <li onClick={this._onSettingsChangeClick({showOrb: !this.props.settings.showOrb})}>
            <input type="checkbox" checked={this.props.settings.showOrb}/>
            オーブを表示
          </li>
          <li onClick={this._onSettingsChangeClick({showFlare: !this.props.settings.showFlare})}>
            <input type="checkbox" checked={this.props.settings.showFlare}/>
            フレアを表示
          </li>
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
    return () => changes;
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: {
        pencilColor: 'cute',
        enableTopLayer: true,
        enableBottomLayer: true,
        showBG: true,
        showOrb: true,
        showFlare: true,
      },
    };
  }

  render() {
    return (
      <div className="app">
        <Canvas assets={this.props.assets} />
        <Sidebar settings={this.state.settings}
                 onSettingsChange={this._onSettingsChange.bind(this)}
                 />
      </div>
    );
  }

  _onSettingsChange(changes) {
    this.setState(changes);
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
