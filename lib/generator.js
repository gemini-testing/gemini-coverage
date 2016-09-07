'use strict';

var inherit = require('inherit'),
    path = require('path'),
    url = require('url'),
    q = require('q'),
    qfs = require('q-io/fs'),
    hb = require('handlebars');

module.exports = inherit({
    __constructor: function(opts, args) {
        this.opts = opts;
        this.args = args;
        this.templateDir = path.join(__dirname, 'templates', opts.template);
    },

    generate: function() {
        var _this = this;

        return qfs.makeTree(this.opts.destDir)
            .then(function() {
                return _this.makeReports();
            });
    },

    makeReports: function() {
        var _this = this,
            reports = [],
            cov = this.args.coverage;

        if (typeof cov === 'string') {
            cov = qfs.read(cov).then(JSON.parse);
        }

        return q.all([qfs.read(path.join(this.templateDir, 'coverage.hbs')), cov])
            .spread(function(tmpl, coverage) {
                return batch(coverage.files.slice());

                // split files processing into batches to avoid too many files being opened
                function batch(files) {
                    if (!files.length) {
                        return;
                    }

                    return q.all(files.splice(0, 10).map(function(fileInfo) {
                        var reportFile = fileInfo.file.replace(/\//g, '_') + '.html',
                            reportPath = path.join(_this.opts.destDir, reportFile);

                        return _this.makeReport(
                            path.resolve(_this.opts.sourceRoot, fileInfo.file),
                            reportPath,
                            {
                                data: fileInfo,
                                tmpl: tmpl
                            })
                            .then(function(rulesStat) {
                                reports.push({
                                    source: fileInfo.file,
                                    report: reportFile,
                                    stat: rulesStat
                                });
                            });
                    }))
                    .then(function() {
                        return batch(files);
                    });
                }
            })
            .then(function() {
                return prepareOutputStats(reports);
            })
            .then(function(stats) {
                return _this.writeIndex(stats);
            })
            .then(function() {
                return _this.copyResources();
            });
    },

    makeReport: function(source, dest, opts) {
        var _this = this,
            fi = opts.data,
            blocks = fi.blocks,
            stat = {
                total: fi.stat.total,
                covered: fi.stat.covered,
                percent: fi.stat.percent,
                level: fi.stat.neverUsed && 'worst' ||
                       fi.stat.percent === 100 && 'perfect' || fi.stat.percent >= 50 && 'good' || 'bad',
                detailReport: true,
                neverUsed: fi.stat.neverUsed
            };

        return qfs.read(source)
            .fail(function() {
                stat.detailReport = false;
                return null;
            })
            .then(function(content) {
                if (!content) {
                    return;
                }

                var lines = content.split(/\r?\n/g);
                // cover into <pre> blocks css lines having some coverage state
                for (var b = blocks.length - 1; b >= 0; b--) {
                    var block = blocks[b];

                    for (var l = block.start.line - 1; l < block.end.line; l++) {
                        lines[l] = '<pre class="' + block.type + '">' + htmlEscape(lines[l]) + ' </pre>';
                    }
                }

                // cover into <pre> blocks everything not covered in the state above
                lines = lines.map(function(line) {
                    return /^<\/?pre/.test(line) ? line : '<pre>' + htmlEscape(line) + ' </pre>';
                });

                return qfs.write(dest, hb.compile(opts.tmpl)({
                    content: lines.join('\n'),
                    source: path.relative(path.dirname(dest), source),
                    projectSource: path.relative(_this.opts.sourceRoot, source),
                    url: url,
                    stat: stat
                }));
            })
            .thenResolve(stat);
    },

    copyResources: function() {
        return qfs.copyTree(path.join(__dirname, 'templates', this.opts.template, 'res'), this.opts.destDir);
    },

    writeIndex: function(stats) {
        var _this = this;
        return qfs.read(path.join(this.templateDir, 'coverage-index.hbs'))
            .then(function(tmpl) {
                return qfs.write(
                    path.join(_this.opts.destDir, 'index.html'),
                    hb.compile(tmpl)(stats));
            });
    }
});

function prepareOutputStats(reports) {
    reports.sort(function(a, b) {
        return a.source.localeCompare(b.source);
    });

    var stat = reports.reduce(
        function(prev, current) {
            prev.covered += current.stat.covered;
            prev.total += current.stat.total;

            return prev;
        },
        {total: 0, covered: 0}
    );

    return q.resolve({
        reports: reports,
        covered: stat.covered,
        total: stat.total,
        percent: Math.round(stat.covered / stat.total * 100)
    });
}

function htmlEscape(s) {
    if (!s) {
        return '';
    }

    var escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
    };

    return s.replace(
        new RegExp('[' + Object.keys(escape).join('') + ']', 'g'),
        function(c) {
            return escape[c] || c;
        }
    );
}
