'use strict';

const Promise = require('bluebird');

exports.common = function() {
    this
        .opt()
            .name('sourceRoot')
            .long('source-root')
            .short('r')
            .title('Set path of the sources. Used to generate detailed report about particular source file.')
            .def(process.cwd())
            .end()
        .arg()
            .name('coverage')
            .title('Path to the coverage.json generated by gemini')
            .req()
            .end();
};

exports.exitCoa = (code) => {
    return Promise.resolve({
        exitCode: code,
        toString: () => ''
    });
};
