function runJsterm() {
  if (typeof grJSTermRunning === 'undefined' || !grJSTermRunning) {
     BOXZOOM_THRESHOLD = 3;  // Minimal size in pixels of the boxzoom-box to trigger a boxzoom-event
     BOXZOOM_TRIGGER_THRESHHOLD = 1000;  // Time to wait (in ms) before triggering boxzoom event instead
                             // of panning when pressing the left mouse button without moving the mouse
     MAX_KERNEL_CONNECTION_ATTEMPTS = 1;  // Maximum number of kernel initialisation attempts
     KERNEL_CONNECT_WAIT_TIME = 100; // Time to wait between kernel initialisation attempts
     RECONNECT_PLOT_TIMEOUT = 100; // Time to wait between attempts to connect to a plot's canvas
     RECONNECT_PLOT_MAX_ATTEMPTS = 50; // Maximum number of canvas reconnection attempts
     BOXZOOM_FILL_STYLE = '#FFAAAA'; // Fill style of the boxzoom box
     BOXZOOM_STROKE_STYLE = '#FF0000'; // Outline style of the boxzoom box

     var gr, comm, widgets = [], jupyterRunning = false;

     /**
      * Sends a mouse-event via jupyter-comm
      * @param  {Object} data Data describing the event
      * @param  {string} id   Identifier of the calling plot
      */
     sendEvt = function(data, id) {
       if (jupyterRunning) {
         comm.send({
           "type": "evt",
           "content": data,
           "id": id
         });
       }
     };

     /**
      * Sends a create-canvas-event via jupyter-comm
      * @param  {number} id The removed plot's id
      */
     createCanvas = function(id, width, height) {
       if (jupyterRunning) {
         comm.send({
           "type": "createCanvas",
           "id": id,
           "width": width,
           "height": height
         });
       }
     };

     /**
      * Sends a save-event via jupyter-comm
      * @param  {Object} data Data to save
      * @param  {string} id   plot identifier
      */
     saveData = function(data, id) {
       if (jupyterRunning) {
         comm.send({
           "type": "save",
           "content": {
             "id": id,
             "data": JSON.stringify(data)
           }
         });
       }
     };

     /**
      * Registration/initialisation of the jupyter-comm
      * @param  {[type]} kernel Jupyter kernel object
      */
     registerComm = function(kernel) {
       kernel.comm_manager.register_target('jsterm_comm', function(c) {
         c.on_msg(function(msg) {
           let data = msg.content.data;
           if (data.type === 'evt') {
             if (typeof widgets[data.id] !== 'undefined') {
               widgets[data.id].msgHandleEvent(data);
             }
           } else if (msg.content.data.type === 'cmd') {
             if (typeof data.id !== 'undefined') {
               if (typeof widgets[data.id] !== 'undefined') {
                 widgets[data.id].msgHandleCommand(data);
               }
             } else {
               for (let key in widgets) {
                 widgets[key].msgHandleCommand(data);
               }
             }
           } else if (data.type === 'draw') {
             draw(msg);
           }
         });
         c.on_close(function() {});
         window.addEventListener('beforeunload', function(e) {
           c.close();
         });
         comm = c;
       });
     };

     /**
      * Function to call when page has been loaded.
      * Determines if running in a jupyter environment.
      */
     onLoad = function() {
       if (typeof Jupyter !== 'undefined') {
         jupyterRunning = true;
         initKernel(0);
       } else {
         drawSavedData();
       }
     };

     /**
      * Jupyter specific initialisation.
      * Retrying maximum `MAX_KERNEL_CONNECTION_ATTEMPTS` times
      * every KERNEL_CONNECT_WAIT_TIME ms
      * @param  {number} attempt number of previous attempts
      */
     initKernel = function(attempt) {
       if (typeof Jupyter !== 'undefined' && Jupyter != null) {
         let kernel = Jupyter.notebook.kernel;
         if (typeof kernel === 'undefined' || kernel == null) {
           if (attempt < MAX_KERNEL_CONNECTION_ATTEMPTS) {
             setTimeout(function() {
               initKernel(attempt + 1);
             }, KERNEL_CONNECT_WAIT_TIME);
           } else {
             console.error('Unable to connect to Jupyter kernel');
           }
         } else {
           registerComm(kernel);
           Jupyter.notebook.events.on('kernel_ready.Kernel', function() {
             registerComm(kernel);
             for (let key in widgets) {
               widgets[key].connectCanvas();
             }
           });
           drawSavedData();
         }
       }
     };

     /**
      * Handles a draw command.
      * @param  {[type]} msg The input message containing the draw command
      */
     draw = function(msg) {
       if (!GR.is_ready) {
         GR.ready(function() {
           return draw(msg);
         });
       } else {
         if (typeof gr === 'undefined') {
           let canvas = document.createElement('canvas');
           canvas.id = 'jsterm-hidden-canvas';
           canvas.width = 640;
           canvas.height = 480;
           canvas.style = 'display: none;';
           document.body.appendChild(canvas);
           gr = new GR('jsterm-hidden-canvas');
           gr.registermeta(gr.GR_META_EVENT_SIZE, sizeCallback);
           gr.registermeta(gr.GR_META_EVENT_NEW_PLOT, newPlotCallback);
           gr.registermeta(gr.GR_META_EVENT_UPDATE_PLOT, updatePlotCallback);
         }
         let arguments = gr.newmeta();
         gr.readmeta(arguments, msg.content.data.json);
         gr.mergemeta(arguments);
       }
     };

     /**
      * Draw data that has been saved in the loaded page
      */
     drawSavedData = function() {
       let data = document.getElementsByClassName("jsterm-data");
       for (let i = 0; i < data.length; i++) {
         let msg = data[i].innerText;
         draw(JSON.parse(msg));
       }
     };

     if (document.readyState!='loading') {
       onLoad();
     } else if (document.addEventListener) {
       document.addEventListener('DOMContentLoaded', onLoad);
     } else document.attachEvent('onreadystatechange', function() {
       if (document.readyState=='complete') {
         onLoad();
       }
     });

     /**
      * Callback for gr-meta's size event. Handles event and resizes canvas if required.
      */
     sizeCallback = function(evt) {
       widgets[evt.plot_id].resize(evt.width, evt.height);
     };

     /**
      * Callback for gr-meta's new plot event. Handles event and creates new canvas.
      */
     newPlotCallback = function(evt) {
       if (typeof widgets[evt.plot_id] === 'undefined') {
         widgets[evt.plot_id] = new JSTermWidget(evt.plot_id);
       }
       widgets[evt.plot_id].draw();
     };

     /**
      * Callback for gr-meta's update plot event. Handles event and creates canvas id needed.
      */
     updatePlotCallback = function(evt) {
       if (typeof widgets[evt.plot_id] === 'undefined') {
         console.error('Updated plot does not exist, creating new object. (id', evt.plot_id, ')');
         widgets[evt.plot_id] = new JSTermWidget(evt.plot_id);
       }
       widgets[evt.plot_id].draw();
     };

     /**
      * Creates a JSTermWidget-Object describing and managing a canvas
      * @param       {number} id     The widget's numerical identifier (belonging context in `meta.c`)
      * @constructor
      */
     JSTermWidget = function(id) {

       /**
        * Initialize the JSTermWidget
        */
       this.init = function() {
         this.canvas = undefined;
         this.overlayCanvas = undefined;
         this.div = undefined;
         this.id = id;  // context id for meta.c (switchmeta)

         this.waiting = false;
         this.oncanvas = function() {};

         // event handling
         this.pinching = false;
         this.panning = false;
         this.prevMousePos = undefined;
         this.boxzoom = false;
         this.keepAspectRatio = true;
         this.boxzoomTriggerTimeout = undefined;
         this.boxzoomPoint = [undefined, undefined];
         this.pinchDiff = 0;
         this.prevTouches = undefined;

         this.sendEvents = false;
         this.handleEvents = true;

         this.width = 640;
         this.height = 480;
       };

       this.init();

       /**
        * Resizes the JSTermWidget
        * @param  {number} width  new canvas width in pixels
        * @param  {number} height new canvas height in pixels
        */
       this.resize = function(width, height) {
         if (width != this.width || height != this.height) {
           this.width = width;
           this.height = height;
           if (this.canvas !== undefined) {
             this.canvas.width = width;
             this.canvas.height = height;
             this.overlayCanvas.width = width;
             this.overlayCanvas.height = height;
             this.div.style = "position: relative; width: " + width + "px; height: " + height + "px;";
           }
           this.draw();
         }
       };

       /**
        * Send an event fired by widget via jupyter-comm
        * @param  {Object} data Event description
        */
       this.sendEvt = function(data) {
         if (this.sendEvents) {
           sendEvt(data, this.id);
         }
       };

       /**
        * Calculate the position of the mouse on the canvas in pixels,
        * relative to the upper left corner.
        * @param  {Event} event    The mouse event to process
        * @return {[number, number]}       The calculated [x, y]-coordinates
        */
       this.getCoords = function(event) {
         let rect = this.canvas.getBoundingClientRect();
         //TODO mind the canvas-padding if necessary!
         return [Math.floor(event.clientX - rect.left), Math.floor(event.clientY - rect.top)];
       };

       /**
        * Send an event to the GR runtime
        * @param  {number} mouseargs (Emscripten) address of the argumentcontainer describing an event
        */
       this.grEventinput = function(mouseargs) {
         gr.switchmeta(this.id);
         gr.inputmeta(mouseargs);
         gr.current_canvas = this.canvas;
         gr.current_context = gr.current_canvas.getContext('2d');
         gr.select_canvas();
         gr.plotmeta();
       };

       /**
        * Handles a wheel event (zoom)
        * @param  {number} x       x-coordinate on the canvas of the mouse
        * @param  {number} y       y-coordinate on the canvas of the mouse
        * @param  {number} angle_delta angle the wheel has been turned
        */
       this.handleWheel = function(x, y, angle_delta) {
         if (typeof this.boxzoomTriggerTimeout !== 'undefined') {
           clearTimeout(this.boxzoomTriggerTimeout);
         }
         let mouseargs = gr.newmeta();
         gr.meta_args_push(mouseargs, "x", "i", [x]);
         gr.meta_args_push(mouseargs, "y", "i", [y]);
         gr.meta_args_push(mouseargs, "angle_delta", "d", [angle_delta]);
         this.grEventinput(mouseargs);
       };

       /**
        * Handles a wheel event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleWheel = function (event) {
         let coords = this.getCoords(event);
         this.sendEvt({
           "x": coords[0],
           "y": coords[1],
           "angle_delta": event.deltaY,
           "event": "mousewheel",
         });
         if (this.handleEvents) {
           this.handleWheel(coords[0], coords[1], event.deltaY);
         }
         event.preventDefault();
       };

       /**
        * Handles a mousedown event
        * @param  {number} x       x-coordinate on the canvas of the mouse
        * @param  {number} y       y-coordinate on the canvas of the mouse
        * @param  {number} button  Integer indicating the button pressed (0: left, 1: middle/wheel, 2: right)
        * @param  {Boolean} ctrlKey Boolean indicating if the ctrl-key is pressed
        */
       this.handleMouseDown = function(x, y, button, ctrlKey) {
         if (typeof this.boxzoomTriggerTimeout !== 'undefined') {
           clearTimeout(this.boxzoomTriggerTimeout);
         }
         if (button == 0) {
           this.overlayCanvas.style.cursor = 'move';
           this.panning = true;
           this.boxzoom = false;
           this.prevMousePos = [x, y];
           this.boxzoomTriggerTimeout = setTimeout(function() {this.startBoxzoom(x, y, ctrlKey);}.bind(this), BOXZOOM_TRIGGER_THRESHHOLD);
         } else if (button == 2) {
           this.startBoxzoom(x, y, ctrlKey);
         }
       };

       /**
        * Handles a mousedown event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleMouseDown = function (event) {
         let coords = this.getCoords(event);
         this.sendEvt({
           "x": coords[0],
           "y": coords[1],
           "button": event.button,
           "ctrlKey": event.ctrlKey,
           "event": "mousedown",
         });
         if (this.handleEvents) {
           this.handleMouseDown(coords[0], coords[1], event.button, event.ctrlKey);
         }
         event.preventDefault();
       };

       /**
        * Initiate the boxzoom on the canvas.
        * @param  {number} x       x-coordinate of the mouse
        * @param  {number} y       y-coordinate of the mouse
        * @param  {Boolean} ctrlKey Boolean indicating if the ctrl-key is pressed
        */
       this.startBoxzoom = function(x, y, ctrlKey) {
         this.panning = false;
         this.boxzoom = true;
         if (ctrlKey) {
           this.keepAspectRatio = false;
         }
         this.boxzoomPoint = [x, y];
         this.overlayCanvas.style.cursor = 'nwse-resize';
       };

       /**
        * Handles a mouseup event
        * @param  {number} x       x-coordinate on the canvas of the mouse
        * @param  {number} y       y-coordinate on the canvas of the mouse
        * @param  {number} button  Integer indicating the button pressed (0: left, 1: middle/wheel, 2: right)
        */
       this.handleMouseUp = function(x, y, button) {
         if (typeof this.boxzoomTriggerTimeout !== 'undefined') {
           clearTimeout(this.boxzoomTriggerTimeout);
         }
         if (this.boxzoom) {
           if ((Math.abs(this.boxzoomPoint[0] - x) >= BOXZOOM_THRESHOLD) && (Math.abs(this.boxzoomPoint[1] - y) >= BOXZOOM_THRESHOLD)) {
             let mouseargs = gr.newmeta();
             let diff = [x - this.boxzoomPoint[0], y - this.boxzoomPoint[1]];
             gr.meta_args_push(mouseargs, "x1", "i", [this.boxzoomPoint[0]]);
             gr.meta_args_push(mouseargs, "x2", "i", [this.boxzoomPoint[0] + diff[0]]);
             gr.meta_args_push(mouseargs, "y1", "i", [this.boxzoomPoint[1]]);
             gr.meta_args_push(mouseargs, "y2", "i", [this.boxzoomPoint[1] + diff[1]]);
             if (this.keepAspectRatio) {
               gr.meta_args_push(mouseargs, "keep_aspect_ratio", "i", [1]);
             } else {
               gr.meta_args_push(mouseargs, "keep_aspect_ratio", "i", [0]);
             }
             this.grEventinput(mouseargs);
           }
         }
         this.prevMousePos = undefined;
         this.overlayCanvas.style.cursor = 'auto';
         this.panning = false;
         this.boxzoom = false;
         this.boxzoomPoint = [undefined, undefined];
         this.keepAspectRatio = true;
         let context = this.overlayCanvas.getContext('2d');
         context.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
       };

       /**
        * Handles a mouseup event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleMouseUp = function(event) {
         let coords = this.getCoords(event);
         this.sendEvt({
           "x": coords[0],
           "y": coords[1],
           "button": event.button,
           "event": "mouseup",
         });
         if (this.handleEvents) {
           this.handleMouseUp(coords[0], coords[1], event.button);
         }
         event.preventDefault();
       };

       /**
        * Handles a touchstart event triggered by tapping the touchscreen
        * @param  {Event} event The fired touch event
        */
       this.touchHandleTouchStart = function(event) {
         if (event.touches.length == 1) {
           let coords = this.getCoords(event.touches[0]);
           this.handleMouseDown(coords[0], coords[1], 0, false);
         } else if (event.touches.length == 2) {
           this.pinching = true;
           this.pinchDiff = Math.abs(event.touches[0].clientX - event.touches[1].clientX) + Math.abs(event.touches[0].clientY - event.touches[1].clientY);
           let c1 = this.getCoords(event.touches[0]);
           let c2 = this.getCoords(event.touches[1]);
           this.prevTouches = [c1, c2];
         } else if (event.touches.length == 3) {
           let coords1 = this.getCoords(event.touches[0]);
           let coords2 = this.getCoords(event.touches[1]);
           let coords3 = this.getCoords(event.touches[2]);
           let x = 1 / 3 * (coords1[0] + coords2[0] + coords3[0]);
           let y = 1 / 3 * (coords1[1] + coords2[1] + coords3[1]);
           this.handleDoubleclick(x, y);
         }
         event.preventDefault();
       };

       /**
        * Handles a touchend event
        * @param  {Event} event The fired touch event
        */
       this.touchHandleTouchEnd = function(event) {
         this.handleMouseleave();
       };

       /**
        * Handles a touchmove event triggered by moving fingers on the touchscreen
        * @param  {Event} event The fired touch event
        */
       this.touchHandleTouchmove = function(event) {
         if (event.touches.length == 1) {
           let coords = this.getCoords(event.touches[0]);
           this.handleMouseMove(coords[0], coords[1]);
         } else if (this.pinching && event.touches.length == 2) {
           let c1 = this.getCoords(event.touches[0]);
           let c2 = this.getCoords(event.touches[1]);
           let diff = Math.sqrt(Math.pow(Math.abs(c1[0] - c2[0]), 2) + Math.pow(Math.abs(c1[1] - c2[1]), 2));
           if (typeof this.pinchDiff !== 'undefined' && typeof this.prevTouches !== 'undefined') {
             let factor = this.pinchDiff / diff;

             let mouseargs = gr.newmeta();
             gr.meta_args_push(mouseargs, "x", "i", [(c1[0] + c2[0]) / 2]);
             gr.meta_args_push(mouseargs, "y", "i", [(c1[1] + c2[1]) / 2]);
             gr.meta_args_push(mouseargs, "factor", "d", [factor]);
             this.grEventinput(mouseargs);

             let panmouseargs = gr.newmeta();
             gr.meta_args_push(panmouseargs, "x", "i", [(c1[0] + c2[0]) / 2]);
             gr.meta_args_push(panmouseargs, "y", "i", [(c1[1] + c2[1]) / 2]);
             gr.meta_args_push(panmouseargs, "xshift", "i", [(c1[0] - this.prevTouches[0][0] + c2[0] - this.prevTouches[1][0]) / 2.0]);
             gr.meta_args_push(panmouseargs, "yshift", "i", [(c1[1] - this.prevTouches[0][1] + c2[1] - this.prevTouches[1][1]) / 2.0]);
             this.grEventinput(panmouseargs);
           }
           this.pinchDiff = diff;
           this.prevTouches = [c1, c2];
         }
         event.preventDefault();
       };

       /**
        * Handles a mouseleave event
        */
       this.handleMouseleave = function() {
         if (typeof this.boxzoomTriggerTimeout !== 'undefined') {
           clearTimeout(this.boxzoomTriggerTimeout);
         }
         this.overlayCanvas.style.cursor = 'auto';
         this.panning = false;
         this.prevMousePos = undefined;
         if (this.boxzoom) {
           let context = this.overlayCanvas.getContext('2d');
           context.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
         }
         this.boxzoom = false;
         this.boxzoomPoint = [undefined, undefined];
         this.keepAspectRatio = true;
       };

       /**
        * Handles a mouseleave event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleMouseleave = function(event) {
         this.pinchDiff = undefined;
         this.prevTouches = undefined;
         this.sendEvt({
           "event": "mouseleave",
         });
         if (this.handleEvents) {
           this.handleMouseleave();
         }
       };

       /**
        * Handles a mousemove event
        * @param  {number} x       x-coordinate on the canvas of the mouse
        * @param  {number} y       y-coordinate on the canvas of the mouse
        */
       this.handleMouseMove = function(x, y) {
         if (this.panning) {
           if (typeof this.boxzoomTriggerTimeout !== 'undefined') {
             clearTimeout(this.boxzoomTriggerTimeout);
           }
           let mouseargs = gr.newmeta();
           gr.meta_args_push(mouseargs, "x", "i", [this.prevMousePos[0]]);
           gr.meta_args_push(mouseargs, "y", "i", [this.prevMousePos[1]]);
           gr.meta_args_push(mouseargs, "xshift", "i", [x - this.prevMousePos[0]]);
           gr.meta_args_push(mouseargs, "yshift", "i", [y - this.prevMousePos[1]]);
           this.grEventinput(mouseargs);
           this.prevMousePos = [x, y];
         } else if (this.boxzoom) {
           let context = this.overlayCanvas.getContext('2d');
           let diff = [x - this.boxzoomPoint[0], y - this.boxzoomPoint[1]];
           gr.switchmeta(this.id);
           let box = gr.meta_get_box(this.boxzoomPoint[0], this.boxzoomPoint[1], this.boxzoomPoint[0] + diff[0], this.boxzoomPoint[1] + diff[1], this.keepAspectRatio);
           context.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
           if (diff[0] * diff[1] >= 0) {
             this.overlayCanvas.style.cursor = 'nwse-resize';
           } else {
             this.overlayCanvas.style.cursor = 'nesw-resize';
           }
           context.fillStyle = BOXZOOM_FILL_STYLE;
           context.strokeStyle = BOXZOOM_STROKE_STYLE;
           context.beginPath();
           context.rect(box[0], box[1], box[2], box[3]);
           context.globalAlpha = 0.2;
           context.fill();
           context.globalAlpha = 1.0;
           context.stroke();
           context.closePath();
         }
       };

       /**
        * Handles a mousemove event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleMouseMove = function (event) {
         let coords = this.getCoords(event);
         this.sendEvt({
           "x": coords[0],
           "y": coords[1],
           "event": "mousemove",
         });
         if (this.handleEvents) {
           this.handleMouseMove(coords[0], coords[1]);
         }
         event.preventDefault();
       };

       /**
        * Handles a doubleclick event
        * @param  {number} x       x-coordinate on the canvas of the mouse
        * @param  {number} y       y-coordinate on the canvas of the mouse
        */
       this.handleDoubleclick = function(x, y) {
         let mouseargs = gr.newmeta();
         gr.meta_args_push(mouseargs, "x", "i", [x]);
         gr.meta_args_push(mouseargs, "y", "i", [y]);
         gr.meta_args_push(mouseargs, "key", "s", "r");
         this.grEventinput(mouseargs);
         this.boxzoomPoint = [undefined, undefined];
       };

       /**
        * Handles a doubleclick event triggered by the mouse
        * @param  {Event} event The fired mouse event
        */
       this.mouseHandleDoubleclick = function(event) {
         let coords = this.getCoords(event);
         this.sendEvt({
           "x": coords[0],
           "y": coords[1],
           "event": "doubleclick",
         });
         if (this.handleEvents) {
           this.handleDoubleclick(coords[0], coords[1]);
         }
         event.preventDefault();
       };

       /**
        * Handles an event triggered by a Jupyter Comm message
        * @param  {Object} msg The message describing the event
        */
       this.msgHandleEvent = function(msg) {
         switch(msg.event) {
           case "mousewheel":
             this.handleWheel(msg.x, msg.y, msg.angle_delta);
             break;
           case "mousedown":
             this.handleMouseDown(msg.x, msg.y, msg.button, msg.ctrlKey);
             break;
           case "mouseup":
             this.handleMouseUp(msg.x, msg.y, msg.button);
             break;
           case "mousemove":
             this.handleMouseMove(msg.x, msg.y);
             break;
           case "doubleclick":
             this.handleDoubleclick(msg.x, msg.y);
             break;
           case "mouseleave":
             this.handleMouseleave();
             break;
           default:
             break;
         }
       };

       /**
        * Handles a command received cia jupyter comm
        * @param  {Object} msg Received msg containing the command
        */
       this.msgHandleCommand = function(msg) {
         switch(msg.command) {
           case 'enable_events':
             this.sendEvents = true;
             break;
           case 'disable_events':
             this.sendEvents = false;
             break;
           case 'enable_jseventhandling':
             this.handleEvents = true;
             break;
           case 'disable_jseventhandling':
             this.handleEvents = false;
             break;
           default:
             break;
         }
       };

       /**
        * Draw a plot described by a message received via jupyter comm
        * @param  {Object} msg message containing the draw-command
        */
       this.draw = function() {
         if (this.waiting) {
           this.oncanvas = function() {
             return this.draw();
           };
         } else {
           if (document.getElementById('jsterm-' + this.id) == null) {
             createCanvas(this.id, this.width, this.height);
             this.canvas = undefined;
             this.waiting = true;
             this.oncanvas = function() {
               return this.draw();
             };
             setTimeout(function() {
               this.refreshPlot(this.id, 0);
             }.bind(this), RECONNECT_PLOT_TIMEOUT);
           } else {
             if (document.getElementById('jsterm-' + this.id) !== this.canvas || typeof this.canvas === 'undefined' || typeof this.overlayCanvas === 'undefined') {
               this.connectCanvas();
             }

             gr.switchmeta(this.id);
             gr.current_canvas = this.canvas;
             gr.current_context = gr.current_canvas.getContext('2d');
             gr.select_canvas();
             gr.plotmeta();
           }
         }
       };

       /**
        * Connects a canvas to a JSTermWidget object.
        */
       this.connectCanvas = function() {
         if (document.getElementById('jsterm-' + this.id) != null) {
           this.div = document.getElementById('jsterm-div-' + this.id);
           this.canvas = document.getElementById('jsterm-' + this.id);
           this.overlayCanvas = document.getElementById('jsterm-overlay-' + this.id);
           this.overlayCanvas.addEventListener('DOMNodeRemoved', function() {
             createCanvas(this.id, this.width, this.height);
             this.canvas = undefined;
             this.waiting = true;
             this.oncanvas = function() {};
           });
           this.overlayCanvas.style.cursor = 'auto';

           //registering event handler
           this.overlayCanvas.addEventListener('wheel', function(evt) { this.mouseHandleWheel(evt); }.bind(this));
           this.overlayCanvas.addEventListener('mousedown', function(evt) { this.mouseHandleMouseDown(evt); }.bind(this));
           this.overlayCanvas.addEventListener('touchstart', function(evt) { this.touchHandleTouchStart(evt); }.bind(this));
           this.overlayCanvas.addEventListener('touchmove', function(evt) { this.touchHandleTouchmove(evt); }.bind(this));
           this.overlayCanvas.addEventListener('touchend', function(evt) { this.touchHandleTouchEnd(evt); }.bind(this));
           this.overlayCanvas.addEventListener('mousemove', function(evt) { this.mouseHandleMouseMove(evt); }.bind(this));
           this.overlayCanvas.addEventListener('mouseup', function(evt) { this.mouseHandleMouseUp(evt); }.bind(this));
           this.overlayCanvas.addEventListener('mouseleave', function(evt) { this.mouseHandleMouseleave(evt); }.bind(this));
           this.overlayCanvas.addEventListener('dblclick', function(evt) { this.mouseHandleDoubleclick(evt); }.bind(this));
           this.overlayCanvas.addEventListener('contextmenu', function(event) {
             event.preventDefault();
             return false;
           });
         }
       };

       /**
        * Check if a deleted canvas has been recreated.
        * Calls itself after REFRESH_PLOT_TIMEOUT ms if no canvas is found
        * @param  {number} count [description]
        */
       this.refreshPlot = function(count) {
         if (document.getElementById('jsterm-' + this.id) == null) {
           if (count < RECONNECT_PLOT_MAX_ATTEMPTS) {
             setTimeout(function() {
               this.refreshPlot( count + 1);
             }.bind(this), RECONNECT_PLOT_TIMEOUT);
           }
         } else {
           this.waiting = false;
           if (typeof this.oncanvas !== 'undefined') {
             this.oncanvas();
           }
         }
       };
     };
   }
   var grJSTermRunning = true;
}
