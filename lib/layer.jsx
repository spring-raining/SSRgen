'use strict';

import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';

export default class Layer extends React.Component {
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
