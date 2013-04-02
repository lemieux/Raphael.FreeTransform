/*
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 */

Raphael.fn.freeTransform = function (subject, options, callback) {
  // Enable method chaining
  if (subject.freeTransform) {
    return subject.freeTransform;
  }

  // Add Array.map if the browser doesn't support it
  if (!Array.prototype.hasOwnProperty('map')) {
    Array.prototype.map = function (callback, arg) {
      var i, mapped = [];

      for (i in this) {
        if (this.hasOwnProperty(i)) {
          mapped[i] = callback.call(arg, this[i], i, this);
        }
      }

      return mapped;
    };
  }

  // Add Array.indexOf if not builtin
  if (!Array.prototype.hasOwnProperty('indexOf')) {
    Array.prototype.indexOf = function (obj, start) {
      for (var i = (start || 0), j = this.length; i < j; i++) {
        if (this[i] === obj) {
          return i;
        }
      }
      return -1;
    }
  }

  var
    paper = this,
    bbox = subject.getBBox(true);

  var ft = subject.freeTransform = {
    // Keep track of transformations
    attrs   : {
      x        : bbox.x,
      y        : bbox.y,
      size     : { x: bbox.width, y: bbox.height },
      center   : { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
      rotate   : 0,
      scale    : { x: 1, y: 1 },
      translate: { x: 0, y: 0 },
      ratio    : 1
    },
    axes    : null,
    bbox    : null,
    callback: null,
    items   : [],
    offset  : {
      rotate   : 0,
      scale    : { x: 1, y: 1 },
      translate: { x: 0, y: 0 }
    },
    opts    : {
      animate  : false,
      attrs    : { fill: '#fff', stroke: '#000' },
      boundary : { x: paper._left || 0, y: paper._top || 0, width: paper.width, height: paper.height },
      distance : 1.3,
      drag     : true,
      draw     : true,
      keepRatio: true,
      range    : { rotate: [ -180, 180 ], scale: [ -99999, 99999 ] },
      rotate   : true,
      scale    : true,
      size     : 12,
      icons: {
        width: 24,
        height: 24,
        move: {
          url: '/js/externals/raphael.freetransform/move.png'
        },
        rotate: {
          url: '/js/externals/raphael.freetransform/rotate.png'
        },
        scale: {
          url: '/js/externals/raphael.freetransform/scale.png'
        },
        remove: {
          url: '/js/externals/raphael.freetransform/remove.png'
        }
      }
    },
    subject : subject
  };

  /**
   * Update handles based on the element's transformations
   */
  ft.updateHandles = function () {
    var corners = getBBox();

    // Get the element's rotation
    var rad = {
      x: ( ft.attrs.rotate      ) * Math.PI / 180,
      y: ( ft.attrs.rotate + 90 ) * Math.PI / 180
    };

    var radius = {
      x: ft.attrs.size.x / 2 * ft.attrs.scale.x,
      y: ft.attrs.size.y / 2 * ft.attrs.scale.y
    };

    if (ft.bbox) {
      ft.bbox.toFront().attr({
        path: [
          [ 'M', corners[0].x, corners[0].y ],
          [ 'L', corners[1].x, corners[1].y ],
          [ 'L', corners[2].x, corners[2].y ],
          [ 'L', corners[3].x, corners[3].y ],
          [ 'L', corners[0].x, corners[0].y ]
        ]
      });

      // Allowed x, y scaling directions for bbox handles
      var bboxHandleDirection = [
        [ -1, -1 ],
        [ 1, -1 ],
        [ 1, 1 ],
        [ -1, 1 ],
        [  0, -1 ],
        [ 1, 0 ],
        [ 0, 1 ],
        [ -1, 0 ]
      ];

      if (ft.handles) {
        var i = 0;
        $.each(ft.handles, function (key, handle) {
          var cx, cy, j, k;

          cx = corners[i].x;
          cy = corners[i].y;

          handle.element.toFront()
            .attr({
              x: (cx - ft.opts.size.bboxCorners),
              y: (cy - ft.opts.size.bboxCorners)
            })
            .transform('R' + ft.attrs.rotate)
          ;

          handle.x = bboxHandleDirection[i][0];
          handle.y = bboxHandleDirection[i][1];
          i++;
        });
      }
    }


  };

  /**
   * Add handles
   */
  ft.showHandles = function () {
    ft.hideHandles();

    ft.bbox = paper
      .path('')
      .attr({
        stroke            : ft.opts.attrs.stroke,
        'stroke-dasharray': '- ',
        opacity           : .5
      })
    ;

    ft.handles = {
      move  : {
        element: paper.image(ft.opts.icons.move.url, ft.attrs.center.x, ft.attrs.center.y, ft.opts.icons.width, ft.opts.icons.height).attr({cursor: 'move'})
      },
      rotate: {
        element: paper.image(ft.opts.icons.rotate.url, ft.attrs.center.x, ft.attrs.center.y, ft.opts.icons.width, ft.opts.icons.height).attr({cursor: 'move'})
      },
      scale : {
        element: paper.image(ft.opts.icons.scale.url, ft.attrs.center.x, ft.attrs.center.y, ft.opts.icons.width, ft.opts.icons.height).attr({cursor: 'move'})
      },
      remove: {
        element: paper.image(ft.opts.icons.remove.url, ft.attrs.center.x, ft.attrs.center.y, ft.opts.icons.width, ft.opts.icons.height).attr({cursor: 'pointer'})
      }
    };

    // bind rotate
    ft.handles.rotate.element.drag(function (dx, dy) {
      var axis = 'x';
      // viewBox might be scaled
      if (ft.o.viewBoxRatio) {
        dx *= ft.o.viewBoxRatio.x;
        dy *= ft.o.viewBoxRatio.y;
      }

      var
        cx = dx + ft.handles.rotate.ox,
        cy = dy + ft.handles.rotate.oy
        ;

      var mirrored = {
        x: ft.o.scale.x < 0,
        y: ft.o.scale.y < 0
      };

        var rad = Math.atan2(cy - ft.o.center.y - ft.o.translate.y, cx - ft.o.center.x - ft.o.translate.x);

        ft.attrs.rotate = rad * 180 / Math.PI + 45;

        if (mirrored[axis]) {
          ft.attrs.rotate -= 180;
        }

      // Keep handle within boundaries
      if (ft.opts.boundary) {
        cx = Math.max(Math.min(cx, ft.opts.boundary.x + ft.opts.boundary.width), ft.opts.boundary.x);
        cy = Math.max(Math.min(cy, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y);
      }

      var radius = Math.sqrt(Math.pow(cx - ft.o.center.x - ft.o.translate.x, 2) + Math.pow(cy - ft.o.center.y - ft.o.translate.y, 2));

      applyLimits();

      // Maintain aspect ratio
      keepRatio(axis);


      if (ft.attrs.scale.x && ft.attrs.scale.y) {
        ft.apply();
      }

      asyncCallback([ 'rotate' ]);
    }, function () {
      // Offset values
      ft.o = cloneObj(ft.attrs);

      if (paper._viewBox) {
        ft.o.viewBoxRatio = {
          x: paper._viewBox[2] / paper.width,
          y: paper._viewBox[3] / paper.height
        };
      }
      ft.handles.rotate.ox = this.attrs.x;
      ft.handles.rotate.oy = this.attrs.y;

      asyncCallback(['rotate start' ]);
    }, function () {
      asyncCallback(['rotate end' ]);
    });

    // bind scale

    ft.handles.scale.element.drag(function (dx, dy) {
      // viewBox might be scaled
      if (ft.o.viewBoxRatio) {
        dx *= ft.o.viewBoxRatio.x;
        dy *= ft.o.viewBoxRatio.y;
      }

      var
        sin, cos, rx, ry, rdx, rdy, mx, my, sx, sy,
        previous = cloneObj(ft.attrs)
        ;

      sin = ft.o.rotate.sin;
      cos = ft.o.rotate.cos;

      // First rotate dx, dy to element alignment
      rx = dx * cos - dy * sin;
      ry = dx * sin + dy * cos;

      rx *= Math.abs(ft.handles.scale.x);
      ry *= Math.abs(ft.handles.scale.y);

      // And finally rotate back to canvas alignment
      rdx = rx * cos + ry * sin;
      rdy = rx * -sin + ry * cos;

      ft.attrs.translate = {
        x: ft.o.translate.x + rdx / 2,
        y: ft.o.translate.y + rdy / 2
      };

      // Mouse position, relative to element center after translation
      mx = ft.o.handlePos.cx + dx - ft.attrs.center.x - ft.attrs.translate.x;
      my = ft.o.handlePos.cy + dy - ft.attrs.center.y - ft.attrs.translate.y;

      // Position rotated to align with element
      rx = mx * cos - my * sin;
      ry = mx * sin + my * cos;

      // Maintain aspect ratio
      var ratio = ( ft.attrs.size.x * ft.attrs.scale.x ) / ( ft.attrs.size.y * ft.attrs.scale.y );
      var tdy = rx * ft.handles.scale.x * ( 1 / ratio );
      var tdx = ry * ft.handles.scale.y * ratio;

      if (tdx > tdy * ratio) {
        rx = tdx * ft.handles.scale.x;
      } else {
        ry = tdy * ft.handles.scale.y;
      }

      // Scale element so that handle is at mouse position
      sx = rx * 2 * ft.handles.scale.x / ft.o.size.x;
      sy = ry * 2 * ft.handles.scale.y / ft.o.size.y;

      ft.attrs.scale = {
        x: sx || ft.attrs.scale.x,
        y: sy || ft.attrs.scale.y
      };

      // Check boundaries
      if (!isWithinBoundaries().x || !isWithinBoundaries().y) {
        ft.attrs = previous;
      }

      applyLimits();

      // Maintain aspect ratio
      keepRatio('x');

      var trans = {
        x: ( ft.attrs.scale.x - ft.o.scale.x ) * ft.o.size.x * ft.handles.scale.x,
        y: ( ft.attrs.scale.y - ft.o.scale.y ) * ft.o.size.y * ft.handles.scale.y
      };

      rx = trans.x * cos + trans.y * sin;
      ry = -trans.x * sin + trans.y * cos;

      ft.attrs.translate.x = ft.o.translate.x + rx / 2;
      ft.attrs.translate.y = ft.o.translate.y + ry / 2;

      ft.attrs.ratio = ft.attrs.scale.x / ft.attrs.scale.y;

      asyncCallback([ 'scale' ]);

      ft.apply();
    }, function () {
      var
        rotate = ( ( 360 - ft.attrs.rotate ) % 360 ) / 180 * Math.PI,
        handlePos = ft.handles.scale.element.attr(['x', 'y']);

      // Offset values
      ft.o = cloneObj(ft.attrs);

      ft.o.handlePos = {
        cx: handlePos.x + ft.opts.size.bboxCorners,
        cy: handlePos.y + ft.opts.size.bboxCorners
      };

      // Pre-compute rotation sin & cos for efficiency
      ft.o.rotate = {
        sin: Math.sin(rotate),
        cos: Math.cos(rotate)
      };

      if (paper._viewBox) {
        ft.o.viewBoxRatio = {
          x: paper._viewBox[2] / paper.width,
          y: paper._viewBox[3] / paper.height
        };
      }

      asyncCallback([ 'scale start' ]);
    }, function () {
      asyncCallback([ 'scale end'   ]);
    });

    // bind rotate
    ft.handles.move.element.drag(function (dx, dy) {
      // viewBox might be scaled
      if (ft.o.viewBoxRatio) {
        dx *= ft.o.viewBoxRatio.x;
        dy *= ft.o.viewBoxRatio.y;
      }

      ft.attrs.translate.x = ft.o.translate.x + dx;
      ft.attrs.translate.y = ft.o.translate.y + dy;

      var bbox = cloneObj(ft.o.bbox);

      bbox.x += dx;
      bbox.y += dy;

      applyLimits(bbox);

      asyncCallback([ 'drag' ]);

      ft.apply();
    }, function () {
      // Offset values
      ft.o = cloneObj(ft.attrs);

      // viewBox might be scaled
      if (paper._viewBox) {
        ft.o.viewBoxRatio = {
          x: paper._viewBox[2] / paper.width,
          y: paper._viewBox[3] / paper.height
        };
      }

      asyncCallback([ 'drag start' ]);
    }, function () {
      return;
      asyncCallback([ 'drag end'   ]);
    });

    // bind delete
    ft.handles.remove.element.click(function(){
      subject.freeTransform.unplug();
      subject.remove();

    });

    ft.updateHandles();

    return ft;
  };

  /**
   * Remove handles
   */

  /*

   */
  ft.hideHandles = function (opts) {
    var opts = opts || {}
    if (typeof opts.undrag === 'undefined') {
      opts.undrag = true;
    }

    if (opts.undrag) {
      ft.items.map(function (item) {
        item.el.undrag();
      });
    }

    if (ft.bbox) {
      ft.bbox.remove();

      ft.bbox = null;

      $.each(ft.handles, function () {
        this.element.remove();
      });

      ft.handles = null;
    }

    return ft;
  };

  // Override defaults
  ft.setOpts = function (options, callback) {
    ft.callback = typeof callback === 'function' ? callback : false;

    var i, j;

    for (i in options) {
      if (options[i] && options[i].constructor === Object) {
        for (j in options[i]) {
          if (options[i].hasOwnProperty(j) && ft.opts[i]) {
            ft.opts[i][j] = options[i][j];
          }
        }
      } else {
        ft.opts[i] = options[i];
      }
    }

    if (ft.opts.animate === true) {
      ft.opts.animate = { delay: 700, easing: 'linear' };
    }
    if (ft.opts.drag === true) {
      ft.opts.drag = [ 'center', 'self' ];
    }
    if (ft.opts.keepRatio === true) {
      ft.opts.keepRatio = [ 'bboxCorners'];
    }
    if (ft.opts.scale === true) {
      ft.opts.scale = [ 'bboxCorners' ];
    }

    [ 'drag', 'draw', 'keepRatio', 'rotate', 'scale' ].map(function (option) {
      if (ft.opts[option] === false) {
        ft.opts[option] = [];
      }
    });

    // Force numbers
    ft.opts.range = {
      rotate: [ parseFloat(ft.opts.range.rotate[0]), parseFloat(ft.opts.range.rotate[1]) ],
      scale : [ parseFloat(ft.opts.range.scale[0]), parseFloat(ft.opts.range.scale[1])  ]
    };

    if (typeof ft.opts.size === 'string') {
      ft.opts.size = parseFloat(ft.opts.size);
    }

    if (!isNaN(ft.opts.size)) {
      ft.opts.size = {
        bboxCorners: ft.opts.size,
        center     : ft.opts.size
      };
    }

    ft.showHandles();

    asyncCallback([ 'init' ]);

    return ft;
  };

  ft.setOpts(options, callback);

  /**
   * Apply transformations, optionally update attributes manually
   */
  ft.apply = function () {
    ft.items.map(function (item, i) {
      // Take offset values into account

      var
        center = {
          x: ft.attrs.center.x + ft.offset.translate.x,
          y: ft.attrs.center.y + ft.offset.translate.y
        },
        rotate = ft.attrs.rotate - ft.offset.rotate,
        scale = {
          x: ft.attrs.scale.x / ft.offset.scale.x,
          y: ft.attrs.scale.y / ft.offset.scale.y
        },
        translate = {
          x: ft.attrs.translate.x - ft.offset.translate.x,
          y: ft.attrs.translate.y - ft.offset.translate.y
        };

      if (ft.opts.animate) {
        asyncCallback([ 'animate start' ]);

        item.el.animate(
          { transform: [
            'R', rotate, center.x, center.y,
            'S', scale.x, scale.y, center.x, center.y,
            'T', translate.x, translate.y
          ] + ft.items[i].transformString },
          ft.opts.animate.delay,
          ft.opts.animate.easing,
          function () {
            asyncCallback([ 'animate end' ]);

            ft.updateHandles();
          }
        );
      } else {
        item.el.transform([
          'R', rotate, center.x, center.y,
          'S', scale.x, scale.y, center.x, center.y,
          'T', translate.x, translate.y
        ] + ft.items[i].transformString);

        asyncCallback([ 'apply' ]);

        ft.updateHandles();
      }
    });

    return ft;
  };

  /**
   * Clean exit
   */
  ft.unplug = function () {
    var attrs = ft.attrs;

    ft.hideHandles();

    // Goodbye
    delete subject.freeTransform;

    return attrs;
  };

  // Store attributes for each item
  function scan(subject) {
    ( subject.type === 'set' ? subject.items : [ subject ] ).map(function (item) {
      if (item.type === 'set') {
        scan(item);
      } else {
        ft.items.push({
          el             : item,
          attrs          : {
            rotate   : 0,
            scale    : { x: 1, y: 1 },
            translate: { x: 0, y: 0 }
          },
          transformString: item.matrix.toTransformString()
        });
      }
    });
  }

  scan(subject);

  // Get the current transform values for each item
  ft.items.map(function (item, i) {
    if (item.el._ && item.el._.transform && typeof item.el._.transform === 'object') {
      item.el._.transform.map(function (transform) {
        if (transform[0]) {
          switch (transform[0].toUpperCase()) {
            case 'T':
              ft.items[i].attrs.translate.x += transform[1];
              ft.items[i].attrs.translate.y += transform[2];

              break;
            case 'S':
              ft.items[i].attrs.scale.x *= transform[1];
              ft.items[i].attrs.scale.y *= transform[2];

              break;
            case 'R':
              ft.items[i].attrs.rotate += transform[1];

              break;
          }
        }
      });
    }
  });

  // If subject is not of type set, the first item _is_ the subject
  if (subject.type !== 'set') {
    ft.attrs.rotate = ft.items[0].attrs.rotate;
    ft.attrs.scale = ft.items[0].attrs.scale;
    ft.attrs.translate = ft.items[0].attrs.translate;

    ft.items[0].attrs = {
      rotate   : 0,
      scale    : { x: 1, y: 1 },
      translate: { x: 0, y: 0 }
    };

    ft.items[0].transformString = '';
  }

  ft.attrs.ratio = ft.attrs.scale.x / ft.attrs.scale.y;

  /**
   * Get rotated bounding box
   */
  function getBBox() {
    var rad = {
      x: ( ft.attrs.rotate      ) * Math.PI / 180,
      y: ( ft.attrs.rotate + 90 ) * Math.PI / 180
    };

    var radius = {
      x: ft.attrs.size.x / 2 * ft.attrs.scale.x,
      y: ft.attrs.size.y / 2 * ft.attrs.scale.y
    };

    var
      corners = [],
      signs = [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 }
      ]
      ;

    signs.map(function (sign) {
      corners.push({
        x: ( ft.attrs.center.x + ft.attrs.translate.x + sign.x * radius.x * Math.cos(rad.x) ) + sign.y * radius.y * Math.cos(rad.y),
        y: ( ft.attrs.center.y + ft.attrs.translate.y + sign.x * radius.x * Math.sin(rad.x) ) + sign.y * radius.y * Math.sin(rad.y)
      });
    });

    return corners;
  }

  /**
   * Apply limits
   */
  function applyLimits(bbox) {
    // Keep center within boundaries
    if (ft.opts.boundary) {
      var b = ft.opts.boundary;

      if (ft.attrs.center.x + ft.attrs.translate.x < b.x) {
        ft.attrs.translate.x += b.x - ( ft.attrs.center.x + ft.attrs.translate.x );
      }
      if (ft.attrs.center.y + ft.attrs.translate.y < b.y) {
        ft.attrs.translate.y += b.y - ( ft.attrs.center.y + ft.attrs.translate.y );
      }
      if (ft.attrs.center.x + ft.attrs.translate.x > b.x + b.width) {
        ft.attrs.translate.x += b.x + b.width - ( ft.attrs.center.x + ft.attrs.translate.x );
      }
      if (ft.attrs.center.y + ft.attrs.translate.y > b.y + b.height) {
        ft.attrs.translate.y += b.y + b.height - ( ft.attrs.center.y + ft.attrs.translate.y );
      }
    }

    // Limit range of rotation
    if (ft.opts.range.rotate) {
      var deg = ( 360 + ft.attrs.rotate ) % 360;

      if (deg > 180) {
        deg -= 360;
      }

      if (deg < ft.opts.range.rotate[0]) {
        ft.attrs.rotate += ft.opts.range.rotate[0] - deg;
      }
      if (deg > ft.opts.range.rotate[1]) {
        ft.attrs.rotate += ft.opts.range.rotate[1] - deg;
      }
    }

    // Limit scale
    if (ft.opts.range.scale) {
      if (ft.attrs.scale.x * ft.attrs.size.x < ft.opts.range.scale[0]) {
        ft.attrs.scale.x = ft.opts.range.scale[0] / ft.attrs.size.x;
      }

      if (ft.attrs.scale.y * ft.attrs.size.y < ft.opts.range.scale[0]) {
        ft.attrs.scale.y = ft.opts.range.scale[0] / ft.attrs.size.y;
      }

      if (ft.attrs.scale.x * ft.attrs.size.x > ft.opts.range.scale[1]) {
        ft.attrs.scale.x = ft.opts.range.scale[1] / ft.attrs.size.x;
      }

      if (ft.attrs.scale.y * ft.attrs.size.y > ft.opts.range.scale[1]) {
        ft.attrs.scale.y = ft.opts.range.scale[1] / ft.attrs.size.y;
      }
    }
  }

  function isWithinBoundaries() {
    return {
      x: ft.attrs.scale.x * ft.attrs.size.x >= ft.opts.range.scale[0] && ft.attrs.scale.x * ft.attrs.size.x <= ft.opts.range.scale[1],
      y: ft.attrs.scale.y * ft.attrs.size.y >= ft.opts.range.scale[0] && ft.attrs.scale.y * ft.attrs.size.y <= ft.opts.range.scale[1]
    };
  }

  function keepRatio(axis) {
    if (axis === 'x') {
      ft.attrs.scale.y = ft.attrs.scale.x / ft.attrs.ratio;
    } else {
      ft.attrs.scale.x = ft.attrs.scale.y * ft.attrs.ratio;
    }
  }

  /**
   * Recursive copy of object
   */
  function cloneObj(obj) {
    var i, clone = {};

    for (i in obj) {
      clone[i] = typeof obj[i] === 'object' ? cloneObj(obj[i]) : obj[i];
    }

    return clone;
  }

  var timeout = false;

  /**
   * Call callback asynchronously for better performance
   */
  function asyncCallback(e) {
    if (ft.callback) {
      // Remove empty values
      var events = [];

      e.map(function (e, i) {
        if (e) {
          events.push(e);
        }
      });

      clearTimeout(timeout);

      setTimeout(function () {
        if (ft.callback) {
          ft.callback(ft, events);
        }
      }, 1);
    }
  }

  ft.updateHandles();

  // Enable method chaining
  return ft;
};
