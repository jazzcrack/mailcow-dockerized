// Base64 functions
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(r){var t,e,o,a,h,n,c,d="",C=0;for(r=Base64._utf8_encode(r);C<r.length;)a=(t=r.charCodeAt(C++))>>2,h=(3&t)<<4|(e=r.charCodeAt(C++))>>4,n=(15&e)<<2|(o=r.charCodeAt(C++))>>6,c=63&o,isNaN(e)?n=c=64:isNaN(o)&&(c=64),d=d+this._keyStr.charAt(a)+this._keyStr.charAt(h)+this._keyStr.charAt(n)+this._keyStr.charAt(c);return d},decode:function(r){var t,e,o,a,h,n,c="",d=0;for(r=r.replace(/[^A-Za-z0-9\+\/\=]/g,"");d<r.length;)t=this._keyStr.indexOf(r.charAt(d++))<<2|(a=this._keyStr.indexOf(r.charAt(d++)))>>4,e=(15&a)<<4|(h=this._keyStr.indexOf(r.charAt(d++)))>>2,o=(3&h)<<6|(n=this._keyStr.indexOf(r.charAt(d++))),c+=String.fromCharCode(t),64!=h&&(c+=String.fromCharCode(e)),64!=n&&(c+=String.fromCharCode(o));return c=Base64._utf8_decode(c)},_utf8_encode:function(r){r=r.replace(/\r\n/g,"\n");for(var t="",e=0;e<r.length;e++){var o=r.charCodeAt(e);o<128?t+=String.fromCharCode(o):o>127&&o<2048?(t+=String.fromCharCode(o>>6|192),t+=String.fromCharCode(63&o|128)):(t+=String.fromCharCode(o>>12|224),t+=String.fromCharCode(o>>6&63|128),t+=String.fromCharCode(63&o|128))}return t},_utf8_decode:function(r){for(var t="",e=0,o=c1=c2=0;e<r.length;)(o=r.charCodeAt(e))<128?(t+=String.fromCharCode(o),e++):o>191&&o<224?(c2=r.charCodeAt(e+1),t+=String.fromCharCode((31&o)<<6|63&c2),e+=2):(c2=r.charCodeAt(e+1),c3=r.charCodeAt(e+2),t+=String.fromCharCode((15&o)<<12|(63&c2)<<6|63&c3),e+=3);return t}};

jQuery(function($){
  acl_data = JSON.parse(acl);
  // http://stackoverflow.com/questions/24816/escaping-html-strings-with-jquery
  var entityMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"};
  function escapeHtml(n){return String(n).replace(/[&<>"'`=\/]/g,function(n){return entityMap[n]})}
  function humanFileSize(i){if(Math.abs(i)<1024)return i+" B";var B=["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],e=-1;do{i/=1024,++e}while(Math.abs(i)>=1024&&e<B.length-1);return i.toFixed(1)+" "+B[e]}
  $(".refresh_table").on('click', function(e) {
    e.preventDefault();
    var table_name = $(this).data('table');
    $('#' + table_name).DataTable().ajax.reload();
  });
  function draw_quarantine_table() {
    var table = $('#quarantinetable').DataTable({
      responsive: true,
      processing: true,
      serverSide: false,
      stateSave: true,
      pageLength: pagination_size,
      order: [[2, 'desc']],
      lengthMenu: [
        [10, 25, 50, 100, -1],
        [10, 25, 50, 100, 'all']
      ],
      pagingType: 'first_last_numbers',
      aColumns: [
        { sWidth: '8.25%' },
        { sClass: 'classDataTable' }
      ],
      dom: "<'row'<'col-sm-12 col-md-6'f><'col-sm-12 col-md-6'l>>" +
           "tr" +
           "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      language: lang_datatables,
      initComplete: function(){
        hideTableExpandCollapseBtn('#quarantinetable');
      },
      drawCallback: function(){
        $('#quarantinetable [data-bs-toggle="tooltip"]').tooltip();
        update_execute_staged_actions_btn();
      },
      ajax: {
        type: "GET",
        url: "/api/v1/get/quarantine/all",
        dataSrc: function(data){
          $.each(data, function (i, item) {
            if (item.subject === null) {
              item.subject = '';
            } else {
              item.subject = escapeHtml(item.subject);
            }
            if (item.score === null) {
              item.score = '-';
            }
            if (item.virus_flag > 0) {
              item.virus = '<span class="badge fs-6 bg-danger">' + lang.high_danger + '</span>';
            } else {
              item.virus = '<span class="badge fs-6 bg-secondary">' + lang.neutral_danger + '</span>';
            }
            if (item.action === "reject") {
              item.rspamdaction = '<span class="badge fs-6 bg-danger">' + lang.rejected + '</span>';
            } else if (item.action === "add header") {
              item.rspamdaction = '<span class="badge fs-6 bg-warning">' + lang.junk_folder + '</span>';
            } else if (item.action === "rewrite subject") {
              item.rspamdaction = '<span class="badge fs-6 bg-warning">' + lang.rewrite_subject + '</span>';
            }
            if(item.notified > 0) {
              item.notified = '&#10004;';
            } else {
              item.notified = '&#10006;';
            }
            // Whether the current principal (mailbox user, domain admin or
            // admin) may act on quarantine items at all - the same ACL flag
            // that used to gate the old checkbox mass-action bar now gates
            // release/learnspam/delete uniformly for the row menu and the
            // per-row staging buttons below.
            var can_act = (acl_data.quarantine === 1);

            // Row action menu: a single button offering a choice between
            // "Details" and, where allowed, the direct actions that previously
            // required opening the details modal first.
            item.action = '<div class="btn-group">' +
              '<a href="#" class="btn btn-xs btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i> ' + lang.quick_actions + '</a>' +
              '<ul class="dropdown-menu dropdown-menu-end">' +
              '<li><a class="dropdown-item show_qid_info" href="#" data-item="' + encodeURI(item.id) + '"><i class="bi bi-file-earmark-text"></i> ' + lang.show_item + '</a></li>';
            if (can_act) {
              item.action += '<li><hr class="dropdown-divider"></li>' +
                '<li><a class="dropdown-item" href="#" data-action="edit_selected" data-id="release-single-qitem" data-api-url="edit/qitem" data-api-attr=\'{"action":"release"}\' data-item="' + encodeURI(item.id) + '"><i class="bi bi-inbox"></i> ' + lang.deliver_inbox + '</a></li>' +
                '<li><hr class="dropdown-divider"></li>' +
                '<li><a class="dropdown-item" href="#" data-action="edit_selected" data-id="learnspam-single-qitem" data-api-url="edit/qitem" data-api-attr=\'{"action":"learnspam"}\' data-item="' + encodeURI(item.id) + '"><i class="bi bi-shield-exclamation"></i> ' + lang.learn_spam_delete + '</a></li>' +
                '<li><hr class="dropdown-divider"></li>' +
                '<li><a class="dropdown-item text-danger" href="#" data-action="delete_selected" data-id="delete-single-qitem" data-api-url="delete/qitem" data-item="' + encodeURI(item.id) + '"><i class="bi bi-trash"></i> ' + lang.remove + '</a></li>';
            }
            item.action += '</ul></div>';

            // Per-row staging: mark a row for release/learnspam/delete without
            // executing immediately, so mixed actions across rows can be run
            // together via .execute-staged-actions-btn. "Mark all as..." in
            // the toolbar above the table stages every visible row the same
            // way (see .stage-all-action below).
            item.stage = '';
            if (can_act) {
              item.stage = '<div class="btn-group stage-group" data-item="' + encodeURI(item.id) + '">' +
                '<a href="#" class="btn btn-xs btn-outline-secondary stage-toggle" data-stage-action="release" title="' + lang.deliver_inbox + '"><i class="bi bi-inbox"></i></a>' +
                '<a href="#" class="btn btn-xs btn-outline-secondary stage-toggle" data-stage-action="learnspam" title="' + lang.learn_spam_delete + '"><i class="bi bi-shield-exclamation"></i></a>' +
                '<a href="#" class="btn btn-xs btn-outline-secondary stage-toggle" data-stage-action="delete" title="' + lang.remove + '"><i class="bi bi-trash"></i></a>' +
                '</div>';
            }

            // Sender (SMTP) stays the searchable/sortable value; sender_html adds
            // an on-demand "From" header tooltip without an extra API round trip
            // for every row (see .q-from-info handler below). The title must
            // start non-empty, or Bootstrap treats the tooltip as contentless
            // at init time and later .tooltip('show') calls fail.
            item.sender_html = '<span>' + escapeHtml(item.sender) + '</span> ' +
              '<a href="#" class="q-from-info" data-bs-toggle="tooltip" data-item="' + encodeURI(item.id) + '" title="' + escapeHtml(lang.sender_header) + '"><i class="bi bi-info-circle"></i></a>';
          });

          return data;
        }
      },
      columns: [
        {
          // placeholder, so checkbox will not block child row toggle
          title: '',
          data: null,
          searchable: false,
          orderable: false,
          defaultContent: ''
        },
        {
          title: '',
          data: 'stage',
          searchable: false,
          orderable: false,
          defaultContent: ''
        },
        {
          title: 'ID',
          data: 'id',
          defaultContent: '',
          render: $.fn.dataTable.render.text()
        },
        {
          title: lang.qid,
          data: 'qid',
          defaultContent: '',
          render: $.fn.dataTable.render.text()
        },
        {
          title: lang.sender,
          data: { _: 'sender_html', sort: 'sender', filter: 'sender' },
          className: 'senders-mw220',
          defaultContent: ''
        },
        {
          title: lang.subj,
          data: 'subject',
          defaultContent: ''
        },
        {
          title: lang.rspamd_result,
          data: 'rspamdaction',
          defaultContent: ''
        },
        {
          title: lang.rcpt,
          data: 'rcpt',
          defaultContent: '',
          render: $.fn.dataTable.render.text()
        },
        {
          title: lang.danger,
          data: 'virus',
          defaultContent: ''
        },
        {
          title: lang.spam_score,
          data: 'score',
          defaultContent: ''
        },
        {
          title: lang.notified,
          data: 'notified',
          defaultContent: ''
        },
        {
          title: lang.received,
          data: 'created',
          defaultContent: '',
          createdCell: function(td, cellData) {
            $(td).attr({
              "data-order": cellData,
              "data-sort": cellData
            });

            var date = new Date(cellData ? cellData * 1000 : 0);
            var dateString = date.toLocaleDateString(undefined, {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"});
            $(td).html(dateString);
          }
        },
        {
          title: lang.action,
          data: 'action',
          className: 'dt-text-right dt-sm-head-hidden',
          defaultContent: ''
        },
      ]
    });

    table.on('responsive-resize', function (e, datatable, columns){
      hideTableExpandCollapseBtn('#quarantinetable');
    });
  }

  $('body').on('click', '.show_qid_info', function (e) {
    e.preventDefault();
    var qitem = $(this).attr('data-item');
    var qError = $("#qid_error");

    $('#qidDetailModal').modal('show');
    qError.hide();

    $.ajax({
      url: '/inc/ajax/qitem_details.php',
      data: { id: qitem },
      dataType: 'json',
      success: function(data){

        $('[data-id="qitems_single"]').each(function(index) {
          $(this).attr("data-item", qitem);
        });

        $("#quick_download_link").attr("onclick", "window.open('/inc/ajax/qitem_details.php?id=" + qitem + "&eml', '_blank')");
        $("#quick_release_link").attr("onclick", "window.open('/inc/ajax/qitem_details.php?id=" + qitem + "&quick_release', '_blank')");
        $("#quick_delete_link").attr("onclick", "window.open('/inc/ajax/qitem_details.php?id=" + qitem + "&quick_delete', '_blank')");

        $('#qid_detail_subj').text(data.subject);
        $('#qid_detail_hfrom').text(data.header_from);
        $('#qid_detail_efrom').text(data.env_from);
        $('#qid_detail_score').html('');
        $('#qid_detail_recipients').html('');
        $('#qid_detail_symbols').html('');
        $('#qid_detail_fuzzy').html('');
        if (typeof data.symbols !== 'undefined') {
          data.symbols.sort(function (a, b) {
            if (a.score === 0) return 1;
            if (b.score === 0) return -1;
            if (b.score < 0 && a.score < 0) {
              return a.score - b.score;
            }
            if (b.score > 0 && a.score > 0) {
              return b.score - a.score;
            }
            return b.score - a.score;
          })
          $.each(data.symbols, function (index, value) {
            var highlightClass = '';
            if (value.score > 0) highlightClass = 'negative';
            else if (value.score < 0) highlightClass = 'positive';
            else highlightClass = 'neutral';
            $('#qid_detail_symbols').append('<span data-bs-toggle="tooltip" class="rspamd-symbol ' + highlightClass + '" title="' + (value.options ? escapeHtml(value.options.join(', ')) : '') + '">' + value.name + ' (<span class="score">' + value.score + '</span>)</span>');
          });
          $('[data-bs-toggle="tooltip"]').tooltip();
        }
        if (typeof data.fuzzy_hashes === 'object' && data.fuzzy_hashes !== null && data.fuzzy_hashes.length !== 0) {
          $.each(data.fuzzy_hashes, function (index, value) {
            $('#qid_detail_fuzzy').append('<p style="font-family:monospace">' + escapeHtml(value) + '</p>');
          });
        } else {
          $('#qid_detail_fuzzy').append('-');
        }
        if (typeof data.score !== 'undefined' && typeof data.action !== 'undefined') {
          if (data.action == "add header") {
            $('#qid_detail_score').append('<span class="label-rspamd-action badge fs-6 bg-warning"><b>' + escapeHtml(data.score) + '</b> - ' + lang.junk_folder + '</span>');
          } else if (data.action == "reject") {
            $('#qid_detail_score').append('<span class="label-rspamd-action badge fs-6 bg-danger"><b>' + escapeHtml(data.score) + '</b> - ' + lang.rejected + '</span>');
          } else if (data.action == "rewrite subject") {
            $('#qid_detail_score').append('<span class="label-rspamd-action badge fs-6 bg-warning"><b>' + escapeHtml(data.score) + '</b> - ' + lang.rewrite_subject + '</span>');
          }
        }
        if (typeof data.recipients !== 'undefined') {
          $.each(data.recipients, function(index, value) {
            var elem = $('<span class="mail-address-item"></span>');
            elem.text(value.address + ' (' + value.type.toUpperCase() + ')');
            $('#qid_detail_recipients').append(elem);
          });
        }
        $('#qid_detail_text').text(data.text_plain);
        $('#qid_detail_text_from_html').text(data.text_html);
        var qAtts = $("#qid_detail_atts");
        if (typeof data.attachments !== 'undefined') {
          qAtts.text('');
          $.each(data.attachments, function(index, value) {
            qAtts.append(
              '<p><a href="/inc/ajax/qitem_details.php?id=' + escapeHtml(qitem) + '&amp;att=' + index + '" target="_blank">' + escapeHtml(value[0]) + '</a> (' + escapeHtml(value[1]) + ')' +
              ' - <small><a href="' + escapeHtml(value[3]) + '" target="_blank">' + lang.check_hash + '</a></small></p>'
            );
          });
        }
        else {
          qAtts.text('-');
        }
      },
      error: function(data){
        if (typeof data.error !== 'undefined') {
          $('#qid_detail_subj').text('-');
          $('#qid_detail_hfrom').text('-');
          $('#qid_detail_efrom').text('-');
          $('#qid_detail_score').html('-');
          $('#qid_detail_recipients').html('-');
          $('#qid_detail_symbols').html('-');
          $('#qid_detail_fuzzy').html('-');
          $('#qid_detail_text').text('-');
          $('#qid_detail_text_from_html').text('-');
          qError.text("Error loading quarantine item");
          qError.show();
        }
      }
    });
  });

  // Stage a single row for release/learnspam/delete without executing it yet,
  // so rows can be staged with different actions and applied together via
  // .execute-staged-actions-btn. At most one staged action per row (radio-like).
  function stage_row(toggle_btn, stage_action) {
    var group = toggle_btn.closest('.stage-group');
    group.find('.stage-toggle').removeClass('active btn-success btn-warning btn-danger').addClass('btn-outline-secondary');
    toggle_btn.removeClass('btn-outline-secondary').addClass('active');
    if (stage_action === 'release') toggle_btn.addClass('btn-success');
    else if (stage_action === 'learnspam') toggle_btn.addClass('btn-warning');
    else if (stage_action === 'delete') toggle_btn.addClass('btn-danger');
  }

  $('body').on('click', '.stage-toggle', function (e) {
    e.preventDefault();
    var was_active = $(this).hasClass('active');
    var group = $(this).closest('.stage-group');
    group.find('.stage-toggle').removeClass('active btn-success btn-warning btn-danger').addClass('btn-outline-secondary');
    if (!was_active) {
      stage_row($(this), $(this).data('stage-action'));
    }
    update_execute_staged_actions_btn();
  });

  // "Mark all as..." in the toolbar above/below the table: stages every
  // currently visible row (i.e. the current DataTables page) with the chosen
  // action, replacing the old checkbox "select all + one action for all" bar.
  $('body').on('click', '.stage-all-action', function (e) {
    e.preventDefault();
    var stage_action = $(this).data('stage-action');
    $('.stage-group').each(function () {
      stage_row($(this).find('.stage-toggle[data-stage-action="' + stage_action + '"]'), stage_action);
    });
    update_execute_staged_actions_btn();
  });

  function update_execute_staged_actions_btn() {
    var staged_count = $('.stage-toggle.active').length;
    $('.execute-staged-actions-btn').toggleClass('disabled', staged_count === 0);
  }

  // Run every staged action in one pass: group staged rows by action, fire the
  // release/learnspam requests right away (matches the existing mass-action
  // behaviour, which also does not ask for confirmation), and reuse the
  // existing #ConfirmDeleteModal for the delete bucket before deleting.
  $('body').on('click', '.execute-staged-actions-btn', function (e) {
    e.preventDefault();
    if ($(this).hasClass('disabled')) return;

    var buckets = { release: [], learnspam: [], delete: [] };
    $('.stage-toggle.active').each(function () {
      var stage_action = $(this).data('stage-action');
      var item_id = decodeURIComponent($(this).closest('.stage-group').data('item'));
      buckets[stage_action].push(item_id);
    });

    function reload_page() {
      window.location = window.location.href.split("#")[0];
    }

    function post_edit(items, action) {
      return $.ajax({
        type: "POST",
        dataType: "json",
        data: {
          "items": JSON.stringify(items),
          "attr": JSON.stringify({ "action": action }),
          "csrf_token": csrf_token
        },
        url: '/api/v1/edit/qitem',
        jsonp: false
      });
    }

    function run_release_and_learnspam() {
      var requests = [];
      if (buckets.release.length) requests.push(post_edit(buckets.release, 'release'));
      if (buckets.learnspam.length) requests.push(post_edit(buckets.learnspam, 'learnspam'));
      if (requests.length) {
        $.when.apply($, requests).always(reload_page);
      } else {
        reload_page();
      }
    }

    if (buckets.delete.length) {
      // Reset any leftover one-time handlers a previous, unrelated confirm
      // dialog on this page may have left bound (see delete_selected in
      // 011-api.js), so only this run's handler reacts to the next click.
      $('#IsConfirmed, #isCanceled').off('click');
      $("#ItemsToDelete").empty();
      $.each(buckets.delete, function (i, item_id) {
        $("#ItemsToDelete").append("<li>" + escapeHtml(item_id) + "</li>");
      });
      $('#ConfirmDeleteModal').modal('show')
        .one('click', '#IsConfirmed', function () {
          $.ajax({
            type: "POST",
            dataType: "json",
            cache: false,
            data: {
              "items": JSON.stringify(buckets.delete),
              "csrf_token": csrf_token
            },
            url: '/api/v1/delete/qitem',
            jsonp: false
          }).always(run_release_and_learnspam);
        })
        .one('click', '#isCanceled', function () {
          $('#ConfirmDeleteModal').off();
          $('#ConfirmDeleteModal').modal('hide');
          run_release_and_learnspam();
        });
    } else {
      run_release_and_learnspam();
    }
  });

  // Load the "From" header for a row on demand (hover or, on touch devices,
  // tap/focus) instead of shipping it with every row of the list, which would
  // require parsing the full message for each of up to 100 rows on every
  // table draw. Reuses the existing single-item endpoint and caches the
  // result per row for the lifetime of the page.
  var from_header_cache = {};
  $('body').on('click', '.q-from-info', function (e) {
    e.preventDefault();
  });
  $('body').on('mouseenter focus', '.q-from-info', function () {
    var info_link = $(this);
    var item_id = info_link.data('item');

    function set_tooltip_text(text) {
      info_link.attr('data-bs-original-title', lang.sender_header + ': ' + text);
      // The row was just (re)rendered by DataTables, so this element may not
      // have a Bootstrap tooltip instance yet.
      if (!bootstrap.Tooltip.getInstance(info_link[0])) {
        info_link.tooltip();
      }
      info_link.tooltip('show');
    }

    if (typeof from_header_cache[item_id] !== 'undefined') {
      set_tooltip_text(from_header_cache[item_id]);
      return;
    }

    set_tooltip_text('…');
    $.ajax({
      url: '/inc/ajax/qitem_details.php',
      data: { id: item_id },
      dataType: 'json',
      success: function (data) {
        from_header_cache[item_id] = (data && data.header_from) ? escapeHtml(data.header_from) : '-';
        if (info_link.is(':hover, :focus')) {
          set_tooltip_text(from_header_cache[item_id]);
        }
      },
      error: function () {
        from_header_cache[item_id] = '-';
      }
    });
  });

  $('body').on('click', 'span.footable-toggle', function () {
    event.stopPropagation();
  })

  // Initial table drawings
  draw_quarantine_table();

  function hideTableExpandCollapseBtn(table){
    if ($(table).hasClass('collapsed'))
      $(".table_collapse_option").show();
    else
      $(".table_collapse_option").hide();
  }
});




