'use strict';

import React from 'react';

export default class Modal extends React.Component {
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

Modal.propTypes = {
  className: React.PropTypes.string,
  onCloseButtonClick: React.PropTypes.func.isRequired,
};
