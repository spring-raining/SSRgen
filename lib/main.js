'use strict';

// The drawing algorithm is inspired by
// http://perfectionkills.com/exploring-canvas-drawing-techniques/

import 'babel-polyfill';
import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';
import {TwitterButton, FacebookButton, FacebookCount, GooglePlusButton, GooglePlusCount} from 'react-social';

// toBlob polyfill
import blueimpCanvasToBlob from 'blueimp-canvas-to-blob';

import packageJson from './../package.json';

const ASSETS = {
  PENCIL_1: 'pencil_1.png',
  PENCIL_2: 'pencil_2.png',
  PENCIL_3: 'pencil_1.png',
  BG: 'bg.png',
  ORB: 'orb.png',
  FLARE: 'flare.png',
  CUTE_FRAME: 'cute_frame.png',
  PASSION_FRAME: 'passion_frame.png',
  COOL_FRAME: 'cool_frame.png',
};

const GRADIENT = {
  cute: [
    {offset: 0.33, color: 'rgb(255, 138, 232)'},
    {offset: 0.67, color: 'rgb(107, 233, 255)'},
  ],
  passion: [
    {offset: 0.33, color: 'rgb(255, 210, 75)'},
    {offset: 0.67, color: 'rgb(255, 138, 232)'},
  ],
  cool: [
    {offset: 0.33, color: 'rgb(125, 215, 255)'},
    {offset: 0.67, color: 'rgb(255, 229, 133)'},
  ],
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

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return `(${this.x.toString()}, ${this.y.toString()})`;
  }

  scale(s) {
    return new Point(s * this.x, s * this.y);
  }

  add(p) {
    return new Point(this.x + p.x, this.y + p.y);
  }

  sub(p) {
    return new Point(this.x - p.x, this.y - p.y);
  }

  norm() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    let n = this.norm();
    return new Point(this.x / n, this.y / n);
  }

  innerProd(p) {
    return this.x * p.x + this.y * p.y;
  }

  distanceTo(p) {
    return Math.sqrt((this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y));
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  angleBetween(p) {
    return Math.acos(this.innerProd(p) / (this.norm() * p.norm()));
  }
}

function draw(ctx, pencil, p1, p2, dw = null, dh = null) {
  const distance = p1.distanceTo(p2);
  const angle = p2.sub(p1).angle();
  const _dw = dw || pencil.width;
  const _dh = dh || pencil.height;
  for (let i = 0; i < distance; i++) {
    ctx.drawImage(
      pencil,
      p1.x + (Math.cos(angle) * i) - _dw / 2,
      p1.y + (Math.sin(angle) * i) - _dh / 2,
      _dw,
      _dh);
  }
}

function drawPoints(ctx, pencil, points, dw = null, dh = null) {
  const len = points.length;
  for (let i = 0; i <= len - 2; i++) {
    draw(ctx, pencil, points[i], points[i + 1], dw, dh);
  }
}

// ref: en.wikipedia.org/wiki/Centripetal_Catmull–Rom_spline
function spline(points, resolution, acuteThreshold) {
  let len = points.length;
  if (len <= 2) {
    return points;
  }
  let vs = points.slice();
  vs.unshift(points[0].add(points[0].sub(points[1])));
  vs.push(points[len - 1].add(points[len - 1].sub(points[len - 2])));
  let ps = [];
  let numVs = vs.length;
  for (let i = 0; i <= numVs - 4; i++) {
    let s = segment(vs[i], vs[i + 1], vs[i + 2], vs[i + 3], resolution, acuteThreshold);
    ps = ps.concat(s);
  }
  ps.push(points[len - 1]);
  return ps;
}

function segment(v0, v1, v2, v3, resolution, acuteThreshold) {
  let g1 = v0.sub(v1).angleBetween(v2.sub(v1));
  let g2 = v1.sub(v2).angleBetween(v3.sub(v2));
  if (0 < g1 && g1 < Math.PI && g1 < acuteThreshold) {
    let t = v2.sub(v1).normalize();
    let v = v0.sub(v1);
    let n = v.scale(t.innerProd(t)).sub(t.scale(t.innerProd(v))).normalize();
    v0 = v1.add(t.scale(v.innerProd(t)).add(n.scale(-v.innerProd(n))));
  }
  if (0 < g2 && g2 < Math.PI && g2 < acuteThreshold) {
    let t = v1.sub(v2).normalize();
    let v = v3.sub(v2);
    let n = v.scale(t.innerProd(t)).sub(t.scale(t.innerProd(v))).normalize();
    v3 = v2.add(t.scale(v.innerProd(t)).add(n.scale(-v.innerProd(n))));
  }
  let t0 = 0;
  let t1 = Math.sqrt(v0.distanceTo(v1)) + t0;
  let t2 = Math.sqrt(v1.distanceTo(v2)) + t1;
  let t3 = Math.sqrt(v2.distanceTo(v3)) + t2;
  let ps = [];
  let dt = (t2 - t1) / resolution;
  for (let i = 0, t = t1; i < resolution; i++, t += dt) {
    let a0 = v0.scale((t1 - t) / (t1 - t0)).add(v1.scale((t - t0) / (t1 - t0)));
    let a1 = v1.scale((t2 - t) / (t2 - t1)).add(v2.scale((t - t1) / (t2 - t1)));
    let a2 = v2.scale((t3 - t) / (t3 - t2)).add(v3.scale((t - t2) / (t3 - t2)));
    let b0 = a0.scale((t2 - t) / (t2 - t0)).add(a1.scale((t - t0) / (t2 - t0)));
    let b1 = a1.scale((t3 - t) / (t3 - t1)).add(a2.scale((t - t1) / (t3 - t1)));
    let c  = b0.scale((t2 - t) / (t2 - t1)).add(b1.scale((t - t1) / (t2 - t1)));
    ps.push(c);
  }
  return ps;
}

function simplify(points, strength) {
  let len = points.length;
  if (len <= 2) {
    return points;
  }
  else {
    let vs = [];
    for (let i = 0; i <= len - 2; i++) {
      vs.push(points[i + 1].sub(points[i]));
    }
    let ps = [points[0]];
    let k = 0;
    for (let i = 1; i <= len - 2; i++) {
      let d = points[k].distanceTo(points[i]);
      if (d > strength) {
        ps.push(points[i]);
        k = i;
      }
      else {
        let a = vs[i].sub(vs[k]).norm();
        if (a > strength) {
          ps.push(points[i]);
          k = i;
        }
      }
    }
    ps.push(points[len - 1]);
    return ps;
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
    };
    this.undoBuffer = null;
    this.swapBuffer = null;
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
    if (!this.undoBuffer) {
      this.undoBuffer = document.createElement('canvas');
      this.undoBuffer.width = 1280;
      this.undoBuffer.height = 720;
    }
    const undoCtx = this.undoBuffer.getContext('2d');
    undoCtx.globalCompositeOperation = "source-over";
    undoCtx.shadowBlur = 0;
    undoCtx.clearRect(0, 0, 1280, 720);
    undoCtx.drawImage(this.getCanvas(), 0, 0);
  }

  retrieveUndoBuffer() {
    this.state.ctx.globalCompositeOperation = "source-over";
    this.state.ctx.shadowBlur = 0;
    this.state.ctx.clearRect(0, 0, 1280, 720);
    if (this.undoBuffer) {
      this.state.ctx.drawImage(this.undoBuffer, 0, 0);
    }
  }

  swapUndoBuffer() {
    if (!this.undoBuffer) {
      this.undoBuffer = document.createElement('canvas');
      this.undoBuffer.width = 1280;
      this.undoBuffer.height = 720;
    }
    if (!this.swapBuffer) {
      this.swapBuffer = document.createElement('canvas');
      this.swapBuffer.width = 1280;
      this.swapBuffer.height = 720;
    }
    const undoCtx = this.undoBuffer.getContext('2d');
    const swapCtx = this.swapBuffer.getContext('2d');
    swapCtx.globalCompositeOperation = "source-over";
    swapCtx.shadowBlur = 0;
    swapCtx.clearRect(0, 0, 1280, 720);
    swapCtx.drawImage(this.getCanvas(), 0, 0);
    this.state.ctx.globalCompositeOperation = "source-over";
    this.state.ctx.shadowBlur = 0;
    this.state.ctx.clearRect(0, 0, 1280, 720);
    this.state.ctx.drawImage(this.undoBuffer, 0, 0);
    undoCtx.globalCompositeOperation = "source-over";
    undoCtx.shadowBlur = 0;
    undoCtx.clearRect(0, 0, 1280, 720);
    undoCtx.drawImage(this.swapBuffer, 0, 0);
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
      sketchLayerCommand: null,
    };
    this.points = [];
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.settings.pencilColor !== this.props.settings.pencilColor) {
      this.setState({
        bottomLayerCommand: this.drawGradientEffect.bind(this),
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
        <Layer ref="sketch"
               command={this.state.sketchLayerCommand} />
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

    return new Point(
      (e.clientX - offsetX) / scale,
      (e.clientY - offsetY) / scale
    );
  }

  getPencilBG(name) {
    return (name === 'cute') ? this.props.assets.CUTE_BG :
           (name === 'cool') ? this.props.assets.COOL_BG :
           (name === 'passion') ? this.props.assets.PASSION_BG :
           null;
  }

  generate(plain = false) {
    return co(function *() {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';

      if (this.props.settings.showBG && !plain) {
        ctx.drawImage(this.refs.BG.getCanvas(), 0, 0);
      }
      ctx.drawImage(this.refs.bottom.getCanvas(), 0, 0);
      ctx.drawImage(this.refs.topShadow.getCanvas(), 0, 0);
      ctx.drawImage(this.refs.top.getCanvas(), 0, 0);
      if (this.props.settings.showOrb && !plain) {
        ctx.drawImage(this.refs.orb.getCanvas(), 0, 0);
      }
      if (this.props.settings.showFlare && !plain) {
        ctx.drawImage(this.refs.flare.getCanvas(), 0, 0);
      }
      if (!plain) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(`SSRサインジェネレータ ${packageJson.homepage}`, 10, 700);
      }
      return canvas;
    }.bind(this));
  }

  trash() {
    const trashCommand = (ctx) =>
      new Promise((resolve) => {
        ctx.clearRect(0, 0, 1280, 720);
        resolve(ctx);
      });

    this.setState({
      topLayerCommand: trashCommand,
      topShadowLayerCommand: trashCommand,
      bottomLayerCommand: trashCommand,
    });
  }

  saveUndoBuffer() {
    this.refs.top.saveUndoBuffer();
    this.refs.topShadow.saveUndoBuffer();
    this.refs.bottom.saveUndoBuffer();
    this.props.onBufferUpdate();
  }

  retrieveUndoBuffer() {
    this.refs.top.retrieveUndoBuffer();
    this.refs.topShadow.retrieveUndoBuffer();
    this.refs.bottom.retrieveUndoBuffer();
    this.setState({
      bottomLayerCommand: this.drawGradientEffect.bind(this),
    });
  }

  swapUndoBuffer() {
    this.refs.top.swapUndoBuffer();
    this.refs.topShadow.swapUndoBuffer();
    this.refs.bottom.swapUndoBuffer();
    this.setState({
      bottomLayerCommand: this.drawGradientEffect.bind(this),
    });
  }

  drawGradientEffect(ctx) {
    return new Promise((resolve) => {
      const bottomGradient = GRADIENT[this.props.settings.pencilColor];
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      bottomGradient.forEach((g) => {
        grad.addColorStop(g.offset, g.color);
      });

      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
      resolve(ctx);
    });
  }

  _onCanvasMouseDown(e) {
    this.saveUndoBuffer();
    const currentPoint = this.getPoint.bind(this)(e);
    this.setState({
      mousePos: currentPoint,
    });
    this.points = [currentPoint];
  }

  _onCanvasMouseMove(e) {
    const currentPoint = this.getPoint.bind(this)(e);

    if (this.state.mousePos) {
      const lastPoint = new Point(this.state.mousePos.x, this.state.mousePos.y);
      const pencil = this.props.assets[this.props.settings.pencilType];
      const pencilSize = PENCIL_SIZE[this.props.settings.pencilType];

      if (currentPoint.x === lastPoint.x && currentPoint.y === lastPoint.y) {
        return;
      }

      if (this.props.settings.drawMode === 'eraser') {
        const eraserCommand = (ctx) =>
          new Promise((resolve) => {
            ctx.globalCompositeOperation = 'destination-out';
            draw(ctx, pencil, lastPoint, currentPoint, pencilSize.bottom[0] * 2, pencilSize.bottom[1] * 2);
            resolve(ctx);
          });

        this.setState({
          topLayerCommand: !this.props.settings.enableTopLayer ? null :
                           eraserCommand,
          topShadowLayerCommand: !this.props.settings.enableTopLayer ? null :
                                 this.props.settings.lightMode ? null :
                                 eraserCommand,
          bottomLayerCommand: !this.props.settings.enableBottomLayer ? null :
                              eraserCommand,
          mousePos: currentPoint,
        });
      }
      else {
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
          co(function *() {
            ctx.globalCompositeOperation = 'source-over';
            draw(ctx, pencil, lastPoint, currentPoint, pencilSize.bottom[0], pencilSize.bottom[1]);

            if (!this.props.settings.lightMode) {
              yield this.drawGradientEffect.bind(this)(ctx);
            }
            return ctx;
          }.bind(this));

        if (this.props.settings.enableSmoothing) {
          this.setState({
            sketchLayerCommand: topLayerCommand,
            mousePos: currentPoint,
          });
          this.points.push(currentPoint);
        }
        else {
          this.setState({
            topLayerCommand: !this.props.settings.enableTopLayer ? null :
                             topLayerCommand,
            topShadowLayerCommand: !this.props.settings.enableTopLayer ? null :
                                   this.props.settings.lightMode ? null :
                                   topShadowLayerCommand,
            bottomLayerCommand: !this.props.settings.enableBottomLayer ? null :
                                bottomLayerCommand,
            mousePos: currentPoint,
          });
        }
      }
    }
  }

  _onCanvasMouseUp(e) {
    if (this.props.settings.enableSmoothing && this.props.settings.drawMode !== 'eraser') {
      const pencil = this.props.assets[this.props.settings.pencilType];
      const pencilSize = PENCIL_SIZE[this.props.settings.pencilType];
      const points = spline(
        simplify(this.points, this.props.settings.smoothingStrength),
        10,
        this.props.settings.acuteThreshold * Math.PI / 180
      );
      this.points = [];

      const topLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          drawPoints(ctx, pencil, points, pencilSize.top[0], pencilSize.top[1]);
          resolve(ctx);
        });

      const topShadowLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          drawPoints(ctx, pencil, points, pencilSize.top[0], pencilSize.top[1]);
          resolve(ctx);
        });

      const bottomLayerCommand = (ctx) =>
        co(function *() {
          ctx.globalCompositeOperation = 'source-over';
          drawPoints(ctx, pencil, points, pencilSize.bottom[0], pencilSize.bottom[1]);
          yield this.drawGradientEffect.bind(this)(ctx);
          return ctx;
        }.bind(this));

      const sketchLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.clearRect(0, 0, 1280, 720);
          resolve(ctx);
        });

      this.setState({
        mousePos: null,
        topLayerCommand: !this.props.settings.enableTopLayer ? null :
                         topLayerCommand,
        topShadowLayerCommand: !this.props.settings.enableTopLayer ? null :
                               this.props.settings.lightMode ? null :
                               topShadowLayerCommand,
        bottomLayerCommand: !this.props.settings.enableBottomLayer ? null :
                            bottomLayerCommand,
        sketchLayerCommand: sketchLayerCommand,
      });
    }
    else {
      const bottomLayerCommand = (ctx) =>
        co(function *() {
          if (this.props.settings.lightMode) {
            yield this.drawGradientEffect.bind(this)(ctx);
          }
          return ctx;
        }.bind(this));

      const sketchLayerCommand = (ctx) =>
        new Promise((resolve) => {
          ctx.clearRect(0, 0, 1280, 720);
          resolve(ctx);
        });

      this.setState({
        mousePos: null,
        topLayerCommand: null,
        topShadowLayerCommand: null,
        bottomLayerCommand: bottomLayerCommand,
        sketchLayerCommand: sketchLayerCommand,
      });
    }
  }

  _onCanvasTouchStart(e) {
    const touch = e.changedTouches[0];
    this._onCanvasMouseDown.bind(this)({
      clientX: touch.pageX,
      clientY: touch.pageY,
    });
  }

  _onCanvasTouchMove(e) {
    e.preventDefault();

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
            <button onClick={this.props.onPlayWithMovieButtonClick}>
              演出を鑑賞
            </button>
          </div>
          <div className="sidebar__section">
            <button onClick={this.props.onFullscreenButtonClick}>
              {this.props.fullscreen? '全画面を中止' : '全画面で編集'}
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
            <label>
              <li>
                <input type="checkbox"
                       checked={this.props.settings.enableSmoothing}
                       onChange={this._onSettingsChangeClick({enableSmoothing: !this.props.settings.enableSmoothing})}
                       />
                線を滑らかにする
              </li>
            </label>
            <label>
              <li>
                補正の強さ
                <input type="number"
                       min="0"
                       value={this.props.settings.smoothingStrength}
                       onChange={(event) => this._onSettingsChangeClick({smoothingStrength: event.target.value | 0})()}
                       />
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

            <div>contributors</div>
            <ul>
              {packageJson.contributors.map((e) =>
                <li key={e.name}><a href={e.url}>{e.name}</a></li>
              )}
            </ul>
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
        characterTitle: '',
        characterName: '',
        characterImage: null,
        enableSmoothing: true,
        smoothingStrength: 8,
        acuteThreshold: 10, // TODO: editable?
      },
      windowWidth: 1280,
      windowHeight: 720,
      fullscreen: false,
      modal: null,
      undone: false,
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
                  onBufferUpdate={this._onBufferUpdate.bind(this)}
                  />
          <div className="app__accessory">
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
            <button className="app__undo"
                    onClick={this._onUndoButtonClick.bind(this)}
                    >
              <i className={`fa ${this.state.undone? 'fa-repeat' : 'fa-undo'}`} aria-hidden="true"></i>
            </button>
            <button className="app__trash"
                    onClick={this._onTrashButtonClick.bind(this)}
                    >
              <i className="fa fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <Sidebar settings={this.state.settings}
                 fullscreen={this.state.fullscreen}
                 onSettingsChange={this._onSettingsChange.bind(this)}
                 onGenerateButtonClick={this._onGenerateButtonClick.bind(this)}
                 onPlayWithMovieButtonClick={this._onPlayWithMovieButtonClick.bind(this)}
                 onFullscreenButtonClick={this._onFullscreenButtonClick.bind(this)}
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

  popupPlayWithMovieModal(image) {
    const modal = (
      <Modal className="sign-video-modal"
             onCloseButtonClick={this._onCloseButtonClick.bind(this)}>
        <MoviePlayer image={image}
                     settings={this.state.settings}
                     onSettingsChange={this._onSettingsChange.bind(this)}/>
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

  _onPlayWithMovieButtonClick() {
    co(function *() {
      const canvas = yield this.refs.canvas.generate(true);
      const objectURL = yield canvasToObjectURL(canvas);
      const image = new Image();
      image.src = objectURL;
      this.popupPlayWithMovieModal(image);
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
    this.setState({
      undone: !this.state.undone,
    });
  }

  _onCloseButtonClick() {
    this.setState({
      modal: null,
    });
  }

  _onTrashButtonClick() {
    if (window.confirm('キャンバスを全て消去しますか？')) {
      this.refs.canvas.saveUndoBuffer();
      this.refs.canvas.trash();
    }
  }

  _onBufferUpdate() {
    this.setState({
      undone: false,
    });
  }
}

class MoviePlayer extends React.Component {
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

co(function *() {
  const assets = {};
  for (let key of Object.keys(ASSETS)) {
    assets[key] = yield fetchAsset(ASSETS[key]);
  };

  ReactDOM.render(
    <App assets={assets} />,
    document.getElementById('renderpoint')
  );
});
