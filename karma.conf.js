module.exports = function(config) {
  config.set({
    basePath: '',

    frameworks: ['jasmine', 'browserify'],

    files: [
      'test/spec/*Spec.js'
    ],

    exclude: [],

    preprocessors: {
      'test/**/*.js': 'browserify'
    },

    browserify: {
      transform: ['browserify-istanbul'],
    },

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      dir: 'test/coverage',
      reporters: [
        { type: 'lcov' },
        { type: 'json' }
      ]
    },

    port: 8080,

    logLevel: config.LOG_INFO,

    autoWatch: false,

    customLaunchers: { 
      PhantomJS_custom: {
        base: 'PhantomJS',
        options: {
          viewportSize: { width: 1280, height: 720 }
        },
        debug: false
      },
      PhantomJS_debug: {
        base: 'PhantomJS',
        options: {
          viewportSize: { width: 1280, height: 720 }
        },
        debug: true
      }
    },

    //browserNoActivityTimeout: 60000,

    browsers: ['PhantomJS_custom']
    //browsers: ['PhantomJS_debug']
    //browsers: ['Firefox']
    //browsers: ['Chrome']
    //browsers: ['PhantomJS_custom', 'Firefox']
  });
};
