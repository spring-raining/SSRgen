'use strict';

import co from 'co';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import {ASSETS} from './constants';

function fetchAsset(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.src = path;
  });
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
