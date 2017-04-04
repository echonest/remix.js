'use strict';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({
    project: {
      app: ['app'],
      server: ['server'],
      tests: ['tests'],
      css: ['<%= project.app %>/**/*.css'],
      html: ['<%= project.app %>/**/*.html'],
      alljs: ['<%= project.app %>/js/**/*.js', '<%= project.server %>/**/*.js']
    },

    jshint: {
      all: ['<%= project.alljs %>', 'Gruntfile.js', 'server.js'],
      options: {
        jshintrc: true
      }
    },

    jscs: {
      src: ['<%= project.alljs %>', 'Gruntfile.js', 'server.js'],
      options: {
        config: '.jscsrc'
      }
    },

    browserify: {
      dev: {
        src: ['<%= project.app %>/js/**/*.js'],
        dest: 'build/app_bundle.js',
        options: {
          transform: ['debowerify']
        }
      }
    },

    clean: {
      src: ['build/']
    },

    copy: {
      dev: {
        cwd: 'app',
        expand: true,
        src: ['index.html', 'src/**/*.js', 'js/templates/**/*.html', 'css/**/*.css', 'img/**/*.*', 'fonts/**/*.*'],
        dest: 'build/'
      }
    }
  });

  grunt.registerTask('test', ['jshint', 'jscs', 'browserify:test']);
  grunt.registerTask('build', ['clean', 'browserify:dev', 'copy:dev']);
  grunt.registerTask('default', ['test', 'build']);
};
