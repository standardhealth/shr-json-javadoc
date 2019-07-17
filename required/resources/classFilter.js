$(window).on('load', function() {
  $('input#class-filter').on('keyup', function() {
    var matchText = $(this).val().toLowerCase();
    var toShow = $('ul li').hide().filter(function(index, li) {
      return $(li).find('a').text().toLowerCase().includes(matchText);
    });
    if(toShow.length == 0) {
      $('p#no-match').show();
    } else {
      $('p#no-match').hide();
      toShow.show();
    }
  });
});