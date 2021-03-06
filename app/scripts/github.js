/*jshint loopfunc: true */

require(['jquery', 'cookie', 'http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.6.0/highlight.min.js'], function($, Cookies, hljs) {
  $('pre code').each(function(i, module) {
    $(this).css('visibility', 'visible');
    hljs.highlightBlock(module);
  });

  if(false && !Cookies.get('authenticated')) {
    $('pre code').each(function() {
      $(this).parent().append('<div class="code-overlay"><div class="login-button"><i class="fa fa-github" aria-hidden="true"></i> <span>Login with GitHub to view source</span></div></div>');
    });
    $('.login-button').click(function() {
      window.open("https://github.com/login/oauth/authorize?client_id=3d8b7fe111b6c387c261&scope=user:email", "GitHub Login", "width=800,height=550,top=150,left=300");
    });
  }
});
