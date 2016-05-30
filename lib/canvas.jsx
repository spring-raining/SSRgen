'use strict';

import co from 'co';
import React from 'react';
import packageJson from './../package.json';
import {GRADIENT, PENCIL_SIZE} from './constants';
import Layer from './layer';

export default class Canvas extends React.Component {
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

Canvas.propTypes = {
  assets: React.PropTypes.object.isRequired,
  settings: React.PropTypes.object.isRequired,
  windowWidth: React.PropTypes.number.isRequired,
  windowHeight: React.PropTypes.number.isRequired,
  onBufferUpdate: React.PropTypes.func.isRequired,
};

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
