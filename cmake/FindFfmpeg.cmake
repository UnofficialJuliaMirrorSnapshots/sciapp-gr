#.rst:
# FindFfmpeg
# ----------
#
# Find the Ffmpeg video library.
#
# Imported targets
# ^^^^^^^^^^^^^^^^
#
# This module defines the following :prop_tgt:`IMPORTED` target:
#
# ``Ffmpeg::Ffmpeg``
#   The Ffmpeg library, if found.
#
# Result variables
# ^^^^^^^^^^^^^^^^
#
# This module will set the following variables in your project:
#
# ``FFMPEG_INCLUDE_DIRS``
#   where to find libavcodec/avcodec.h, etc.
# ``FFMPEG_LIBRARIES``
#   the libraries to link against to use Ffmpeg.
# ``Ffmpeg_FOUND``
#   If false, do not try to use Ffmpeg.

find_package(BZip2)

if(NOT FFMPEG_INCLUDE_DIR)
    find_path(FFMPEG_INCLUDE_DIR libavcodec/avcodec.h)
endif()

if(NOT FFMPEG_LIBRARY_AVDEVICE)
    find_library(FFMPEG_LIBRARY_AVDEVICE NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}avdevice${GR_THIRDPARTY_LIBRARY_SUFFIX} avdevice)
endif()

if(NOT FFMPEG_LIBRARY_AVFORMAT)
    find_library(FFMPEG_LIBRARY_AVFORMAT NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}avformat${GR_THIRDPARTY_LIBRARY_SUFFIX} avformat)
endif()

if(NOT FFMPEG_LIBRARY_AVFILTER)
    find_library(FFMPEG_LIBRARY_AVFILTER NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}avfilter${GR_THIRDPARTY_LIBRARY_SUFFIX} avfilter)
endif()

if(NOT FFMPEG_LIBRARY_AVCODEC)
    find_library(FFMPEG_LIBRARY_AVCODEC NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}avcodec${GR_THIRDPARTY_LIBRARY_SUFFIX} avcodec)
endif()

if(NOT FFMPEG_LIBRARY_SWSCALE)
    find_library(FFMPEG_LIBRARY_SWSCALE NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}swscale${GR_THIRDPARTY_LIBRARY_SUFFIX} swscale)
endif()

if(NOT FFMPEG_LIBRARY_AVUTIL)
    find_library(FFMPEG_LIBRARY_AVUTIL NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}avutil${GR_THIRDPARTY_LIBRARY_SUFFIX} avutil)
endif()

if(NOT FFMPEG_LIBRARY_THEORA)
    find_library(FFMPEG_LIBRARY_THEORA NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}theora${GR_THIRDPARTY_LIBRARY_SUFFIX} theora)
endif()

if(NOT FFMPEG_LIBRARY_OGG)
    find_library(FFMPEG_LIBRARY_OGG NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}ogg${GR_THIRDPARTY_LIBRARY_SUFFIX} ogg)
endif()

if(NOT FFMPEG_LIBRARY_VPX)
    find_library(FFMPEG_LIBRARY_VPX NAMES ${GR_THIRDPARTY_LIBRARY_PREFIX}vpx${GR_THIRDPARTY_LIBRARY_SUFFIX} vpx)
endif()

find_path(FFMPEG_VERSION_DIR libavcodec/version.h)
if(FFMPEG_VERSION_DIR)
    if(NOT FFMPEG_VERSION_STRING)
        file(READ ${FFMPEG_VERSION_DIR}/libavcodec/version.h FFMPEG_H_TEXT)
        string(REGEX REPLACE ".*#define LIBAVCODEC_VERSION_MAJOR[ \t]*([0-9]+).*" "\\1." FFMPEG_MAJOR_STRING ${FFMPEG_H_TEXT})
        string(REGEX REPLACE ".*#define LIBAVCODEC_VERSION_MINOR[ \t]*([0-9]+).*" "\\1." FFMPEG_MINOR_STRING ${FFMPEG_H_TEXT})
        string(REGEX REPLACE ".*#define LIBAVCODEC_VERSION_MICRO[ \t]*([0-9]+).*" "\\1" FFMPEG_MICRO_STRING ${FFMPEG_H_TEXT})
        string(CONCAT FFMPEG_VERSION_STRING "${FFMPEG_MAJOR_STRING}" "${FFMPEG_MINOR_STRING}" "${FFMPEG_MICRO_STRING}")
    endif()
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(Ffmpeg
        VERSION_VAR FFMPEG_VERSION_STRING
        REQUIRED_VARS FFMPEG_LIBRARY_AVDEVICE FFMPEG_LIBRARY_AVFORMAT FFMPEG_LIBRARY_AVFILTER FFMPEG_LIBRARY_AVCODEC FFMPEG_LIBRARY_SWSCALE FFMPEG_LIBRARY_AVUTIL FFMPEG_LIBRARY_THEORA FFMPEG_LIBRARY_OGG FFMPEG_LIBRARY_VPX FFMPEG_INCLUDE_DIR BZip2_FOUND FFMPEG_VERSION_STRING)

if (Ffmpeg_FOUND)
    set(FFMPEG_INCLUDE_DIRS "${FFMPEG_INCLUDE_DIR}")
    set(FFMPEG_LIBRARIES "${FFMPEG_LIBRARY_AVDEVICE};${FFMPEG_LIBRARY_AVFORMAT};${FFMPEG_LIBRARY_AVFILTER};${FFMPEG_LIBRARY_AVCODEC};${FFMPEG_LIBRARY_SWSCALE};${FFMPEG_LIBRARY_AVUTIL};${FFMPEG_LIBRARY_THEORA};${FFMPEG_LIBRARY_OGG};${FFMPEG_LIBRARY_VPX}")

    if(NOT TARGET Ffmpeg::Ffmpeg)
        add_library(Ffmpeg::Ffmpeg UNKNOWN IMPORTED)
        set_target_properties(Ffmpeg::Ffmpeg PROPERTIES
                INTERFACE_INCLUDE_DIRECTORIES "${FFMPEG_INCLUDE_DIRS}"
                IMPORTED_LINK_INTERFACE_LANGUAGES "C"
                IMPORTED_LOCATION "${FFMPEG_LIBRARY_AVDEVICE}"
                INTERFACE_LINK_LIBRARIES "${FFMPEG_LIBRARY_AVFORMAT};${FFMPEG_LIBRARY_AVFILTER};${FFMPEG_LIBRARY_AVCODEC};${FFMPEG_LIBRARY_SWSCALE};${FFMPEG_LIBRARY_AVUTIL};${FFMPEG_LIBRARY_THEORA};${FFMPEG_LIBRARY_OGG};${FFMPEG_LIBRARY_VPX};BZip2::BZip2")
    endif()
     if(APPLE)
        find_package(Iconv)
        if(Iconv_FOUND)
            target_link_libraries(Ffmpeg::Ffmpeg INTERFACE Iconv::Iconv)
        endif()
    endif()
elseif(${CMAKE_FIND_PACKAGE_NAME}_FIND_REQUIRED)
    message(FATAL_ERROR "${CMAKE_FIND_PACKAGE_NAME} was required but could not be found.")
endif()

mark_as_advanced(FFMPEG_INCLUDE_DIR FFMPEG_LIBRARY_AVDEVICE FFMPEG_LIBRARY_AVFORMAT FFMPEG_LIBRARY_AVFILTER FFMPEG_LIBRARY_AVCODEC FFMPEG_LIBRARY_SWSCALE FFMPEG_LIBRARY_AVUTIL FFMPEG_LIBRARY_THEORA FFMPEG_LIBRARY_OGG FFMPEG_LIBRARY_VPX)
