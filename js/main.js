$(document).ready(function () {

  'use strict';

  /* =======================
  // Simple Search Settings
  ======================= */

  SimpleJekyllSearch({
    searchInput: document.getElementById('js-search-input'),
    resultsContainer: document.getElementById('js-results-container'),
    json: '/search.json',
    searchResultTemplate: '<li><a href="{url}">{title}</a></li>',
    noResultsText: '<li>No results found</li>'
  })

  /* =======================
  // Responsive videos
  ======================= */

  $('.c-wrap-content').fitVids({
    'customSelector': ['iframe[src*="ted.com"]']
  });

  /* =======================================
  // Switching between posts and categories
  ======================================= */

  $('.c-nav__list > .c-nav__item').click(function() {
    $('.c-nav__list > .c-nav__item').removeClass('is-active');
    $(this).addClass('is-active');
    if ($('.c-nav__item:last-child').hasClass('is-active')) {
      $('.c-posts').css('display', 'none').removeClass('o-opacity');
      $('.c-load-more').css('display', 'none')
      $('.c-categories').css('display', '').addClass('o-opacity');
    } else {
      $('.c-posts').css('display', '').addClass('o-opacity');
      $('.c-load-more').css('display', '')
      $('.c-categories').css('display', 'none').removeClass('o-opacity');
    }
  });

  /* =======================
  // Adding ajax pagination
  ======================= */

  $(".c-load-more").click(loadMorePosts);

  function loadMorePosts() {
    var _this = this;
    var $postsContainer = $('.c-posts');
    var nextPage = parseInt($postsContainer.attr('data-page')) + 1;
    var totalPages = parseInt($postsContainer.attr('data-totalPages'));

    $(this).addClass('is-loading').text("Loading...");

    $.get('/page/' + nextPage, function (data) {
      var htmlData = $.parseHTML(data);
      var $articles = $(htmlData).find('article');

      $postsContainer.attr('data-page', nextPage).append($articles);

      if ($postsContainer.attr('data-totalPages') == nextPage) {
        $('.c-load-more').remove();
      }

      $(_this).removeClass('is-loading');
    });
  }

  /* ==============================
  // Smooth scroll to the tags page
  ============================== */

  $('.c-tag__list a').on('click', function (e) {
    e.preventDefault();

    var currentTag = $(this).attr('href'),
      currentTagOffset = $(currentTag).offset().top;

    $('html, body').animate({
      scrollTop: currentTagOffset - 10
    }, 400);

  });

  /* =======================
  // Scroll to top
  ======================= */

  $('.c-top').click(function () {
    $('html, body').stop().animate({ scrollTop: 0 }, 'slow', 'swing');
  });
  $(window).scroll(function () {
    if ($(this).scrollTop() > $(window).height()) {
      $('.c-top').addClass("c-top--active");
    } else {
      $('.c-top').removeClass("c-top--active");
    };
  });

  /* =======================
  // Sidebar Toggle
  ======================= */
  $('.js-sidebar-toggle').click(function() {
    $('body').toggleClass('layout-collapsed');
  });

  /* =======================
  // Table of Contents
  ======================= */
  var $toc = $('#toc');
  if ($toc.length) {
    var $headers = $('.c-article__content').find('h1, h2, h3');
    
    if ($headers.length > 1) {
       var html = '<ul class="toc-list">';
       var prevLevel = 0;
       
       $headers.each(function(index) {
          var $this = $(this);
          var id = $this.attr('id');
          if (!id) {
             id = 'header-' + index;
             $this.attr('id', id);
          }
          
          var level = parseInt($this.prop('tagName').replace('H', ''));
          
          if (index === 0) prevLevel = level;
          
          if (level > prevLevel) {
             html += '<ul>';
          } else if (level < prevLevel) {
             for (var i = 0; i < prevLevel - level; i++) {
                html += '</ul>';
             }
          }
          
          html += '<li><a href="#' + id + '">' + $this.text() + '</a></li>';
          prevLevel = level;
       });
       html += '</ul>';
       
       $toc.html(html).show();
       
       // Scroll Spy
       $(window).scroll(function() {
          var scrollTop = $(window).scrollTop();
          var $currentSection = null;
          
          $headers.each(function() {
             var $this = $(this);
             if ($this.offset().top < scrollTop + 150) {
                $currentSection = $this;
             }
          });
          
          if ($currentSection) {
             var id = $currentSection.attr('id');
             $toc.find('a').removeClass('is-active');
             var $activeLink = $toc.find('a[href="#' + id + '"]');
             $activeLink.addClass('is-active');
          }
       });
    }
  }

});