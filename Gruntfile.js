module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    watch: {
      files: ['src/scss/*'],
      tasks: ['sass']
    },
    sass: {
      dist: {
        files: {
          'public/main.css': 'src/scss/main.scss'
        }
      }
    },
    open: {
      dev: {
        path: 'http://localhost:4000/',
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-open');
  grunt.registerTask('default', ['open', 'watch']);

};
