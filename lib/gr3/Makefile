ifeq ($(strip $(THIRDPARTYDIR)),)
override THIRDPARTYDIR = $(abspath $(CURDIR)/../../3rdparty/build)
endif

       GRDIR = /usr/local/gr
      LIBDIR = $(DESTDIR)$(GRDIR)/lib
      INCDIR = $(DESTDIR)$(GRDIR)/include

UNAME := $(shell uname)

    INCLUDES = -I$(THIRDPARTYDIR)/include -I../gr
      GRLIBS = -L../gr -lGR
     PNGLIBS = $(THIRDPARTYDIR)/lib/libpng.a
    JPEGLIBS = $(THIRDPARTYDIR)/lib/libjpeg.a
       ZLIBS = $(THIRDPARTYDIR)/lib/libz.a
      CFLAGS = -O3 -Wall -Wextra -pedantic -fPIC -DGRDIR=\"$(GRDIR)\" $(EXTRA_CFLAGS)
        OBJS = gr3.o gr3_convenience.o gr3_html.o gr3_povray.o gr3_png.o \
               gr3_jpeg.o gr3_gr.o gr3_mc.o gr3_slices.o
ifeq ($(UNAME), Darwin)
      CFLAGS+= -mmacosx-version-min=10.11
      GLLIBS = -framework OpenGL -framework Cocoa
        OBJS+= gr3_cgl.o
INSTALL_NAME = -Wl,-install_name,@rpath/libGR3.so
     LDFLAGS = $(EXTRA_LDFLAGS) -Wl,-rpath,@loader_path/. -mmacosx-version-min=10.11
     SOFLAGS = -dynamiclib
        LIBS =
else
      GLLIBS =
PLATFORMLIBS = -lX11 -lGL
        OBJS+= gr3_glx.o
INSTALL_NAME =
     LDFLAGS = $(EXTRA_LDFLAGS) -Wl,-rpath,'$$ORIGIN/.'
     SOFLAGS = -shared
        LIBS = -ldl
endif

default: targets

targets: prerequisites libGR3.so

prerequisites:
	$(MAKE) -C ../gr

ifeq ($(UNAME), Linux)
targets: libGR3platform.so
install: install_platform
install_platform:
	@if [ ! -d $(DESTDIR)$(GRDIR) ]; then mkdir -m 755 $(DESTDIR)$(GRDIR); fi
	@if [ ! -d $(LIBDIR) ]; then mkdir -m 755 $(LIBDIR); fi
	cp -r libGR3platform.so $(LIBDIR)
libGR3platform.so: gr3_platform_glx.c
	${CC} -o $@ $^ $(CFLAGS) $(INCLUDES) $(PLATFORMLIBS) $(SOFLAGS) $(LDFLAGS)
endif

.c.o:
	$(CC) -c $< $(CFLAGS) $(INCLUDES)

libGR3.so: $(OBJS)
	$(CC) -o $@ $^ $(CFLAGS) $(JPEGLIBS) $(GLLIBS) $(GRLIBS) $(PNGLIBS) $(ZLIBS) $(LIBS) \
	$(SOFLAGS) $(LDFLAGS) $(INSTALL_NAME)

gr3.c: gr3.h gr3_internals.h
gr3_internals.h: gr3.h gr3_glx.h gr3_cgl.h
gr3_glx.c: gr3_glx.h
gr3_cgl.c: gr3_cgl.h
gr3_convenience.c: gr3_internals.h
gr3_html.c: gr3_internals.h
gr3_povray.c: gr3_internals.h
gr3_png.c: gr3_internals.h
gr3_jpeg.c: gr3_internals.h
gr3_gr.c: gr3_internals.h
gr3_mc.c: gr3.h gr3_mc_data.h
gr3_slices.c: gr3.h

install: targets
	@if [ ! -d $(DESTDIR)$(GRDIR) ]; then mkdir -m 755 $(DESTDIR)$(GRDIR); fi
	@if [ ! -d $(LIBDIR) ]; then mkdir -m 755 $(LIBDIR); fi
	cp -p libGR3.so $(LIBDIR)
	@if [ ! -d $(INCDIR) ]; then mkdir -m 755 $(INCDIR); fi
	cp -p gr3.h $(INCDIR)

clean:
	$(MAKE) -C ../gr clean
	rm -rf libGR3.so*
	rm -rf libGR3platform.so*
	rm -f *.o
