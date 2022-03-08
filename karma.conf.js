// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config, name) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-spec-reporter'),
      require("karma-coverage"),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      reporters: [
        { type: "html",   dir: '../../coverage/' + name },
        { type: "text-summary" },
      ],
    },
    specReporter: {
      maxLogLines: 0,
      showSpecTiming: true,
    },    
    reporters: ['spec', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    browserConsoleLogOptions: {
      level: "debug", format: "%b %T: %m", terminal: false
    },
    autoWatch: true,
    browsers: [],
    singleRun: false,
    restartOnFileChange: true,
  });
};
