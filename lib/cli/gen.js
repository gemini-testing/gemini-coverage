'use strict';

var fs = require('fs'),
    path = require('path'),
    common = require('./common'),
    Generator = require('../generator');

module.exports = function() {
    this.title('Generate html report from gemini coverage statistics')
        .helpful()
        .apply(common.common)
        .opt()
            .name('template')
            .long('template')
            .short('t')
            .title('Template to use')
            .def('default')
            .val(function(val) {
                if (!fs.existsSync(path.resolve(__dirname, '../templates/', val))) {
                    console.warn('Template %s is not found. Using default.', val);
                    return 'default';
                }
                return val;
            })
            .end()
        .opt()
            .name('destDir')
            .long('dest-dir')
            .short('d')
            .title('Destination directory where the report files will be created')
            .def(path.join(process.cwd(), 'gemini-coverage'))
        .act(function(opts, args) {
            return (new Generator(opts, args)).generate()
                .then(common.exitCoa);
        });
};
