'use strict';

import React from 'react';
import {TwitterButton, FacebookButton, FacebookCount, GooglePlusButton, GooglePlusCount} from 'react-social';
import packageJson from './../package.json';

export default class Sidebar extends React.Component {
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

Sidebar.propTypes = {
  settings: React.PropTypes.object.isRequired,
  fullscreen: React.PropTypes.bool.isRequired,
  onSettingsChange: React.PropTypes.func.isRequired,
  onGenerateButtonClick: React.PropTypes.func.isRequired,
  onPlayWithMovieButtonClick: React.PropTypes.func.isRequired,
  onFullscreenButtonClick: React.PropTypes.func.isRequired,
};
