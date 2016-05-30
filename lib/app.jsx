'use strict';

import 'babel-polyfill';
// toBlob polyfill
import 'blueimp-canvas-to-blob';
import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';
import Canvas from './canvas';
import Modal from './modal';
import MoviePlayer from './moviePlayer';
import Sidebar from './sideBar';

export default class App extends React.Component {
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

App.propTypes = {
  assets: React.PropTypes.object.isRequired,
};

function canvasToObjectURL(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      const objectURL = window.URL.createObjectURL(blob);
      resolve(objectURL);
    });
  });
}
