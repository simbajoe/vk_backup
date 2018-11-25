(function (exports) {
    "use strict";

    var toDataURL = function (url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', url);
        xhr.responseType = 'blob';
        xhr.onload = function(){
            var fr = new FileReader();
            fr.onload = function(){
                callback(this.result);
            };
            fr.readAsBinaryString(xhr.response); // async call
        };
        xhr.send();
    };

    var VKDumper = function (nr_posts_limit, pic_size) {
        this.nr_posts_limit = nr_posts_limit;
        this.pic_size = pic_size;
    };

    VKDumper.prototype.load = function (c) {
        var self = this;
        if (typeof c === 'undefined') {
            c = 0;
        }
        var nr_posts_limit = this.nr_posts_limit;
        var count = Math.min(100, nr_posts_limit - c);
        VK.Api.call('wall.get', {
            count: count,
            offset: c,
            v: "5.87"
        }, function (r) {
            console.log(r);
            if (r.error) {
                if (r.error.error_code == 6) {
                    setTimeout(function () {
                        self.load(c);
                    }, 1000);
                }
                return;
            }
            $(r.response.items).each(function () {
                // response:
                //      count: 1
                //      items: Array(1)
                //          0:
                //              date: 1542693137
                //              from_id: 4376856
                //              id: 6273
                //              likes: {count: 1}
                //              text: "Comment text"
                //      profiles: Array(1)
                //          0:
                //              first_name: "Name"
                //              id: 4376856
                //              last_name: "Surname"
                var comments_el = $('<ul>');
                function get_comment(post_id, comments_el) {
                    VK.Api.call(
                        'wall.getComments',
                        {v: "5.87", post_id: post_id, count: 100, preview_length: 0,
                        need_likes: 1, extended: 1, fields: 'first_name,last_name'},
                        function (rc) {
                            //console.log(rc);
                            if (rc.error) {
                                if (rc.error.error_code == 6) {
                                    setTimeout(function () {
                                        get_comment(post_id, comments_el);
                                    }, 1000);
                                }
                                return;
                            }
                            if (rc.response.count == 0) {
                                return;
                            }
                            var profiles = rc.response.profiles.reduce(function(map, obj) {
                                    map[obj.id] = obj.first_name + " " + obj.last_name;
                                    return map;
                            }, {});
                            $(rc.response.items).each(function () {
                                var comment = $('<li>');
                                comment.text(this.text + " - " + profiles[this.from_id]);
                                comment.appendTo(comments_el);
                            });
                        }
                    );
                }
                get_comment(this.id, comments_el);
                var likes_el = $('<ul>');
                //  response:
                //      count: 10
                //      items: Array(10)
                //          0:
                //              first_name: "Tatiana"
                //              id: 254552743
                //              last_name: "Malakhova"
                //              type: "profile"
                //VK.Api.call(
                //    'likes.getList',
                //    {v: "5.87", type: "post", item_id: this.id, extended: 1, },
                //    function (r) {
                //        console.log(r);
                //    }
                //);
                function get_likes(post_id, likes_el) {
                    VK.Api.call(
                        'likes.getList',
                        {v: "5.87", type: "post", item_id: post_id, extended: 1},
                        function (rc) {
                            //console.log('LLL', rc);
                            if (rc.error) {
                                if (rc.error.error_code == 6) {
                                    setTimeout(function () {
                                        get_likes(post_id, likes_el);
                                    }, 1000);
                                }
                                return;
                            }
                            if (rc.response.count == 0) {
                                return;
                            }
                            $(rc.response.items).each(function () {
                                var comment = $('<li>');
                                comment.text(this.first_name + " " + this.last_name);
                                comment.appendTo(likes_el);
                            });
                        }
                    );
                }
                get_likes(this.id, likes_el);
                var p = $("#post_example")
                    .clone()
                    .removeAttr('id')
                    .removeClass('invisible');
                var time = new Date(this.date * 1000);

                var options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
                time = time.toLocaleDateString('ru-RU', options);
                var views = this.views ? this.views.count : "?";
                var likes = this.likes ? this.likes.count : "?";
                var reposts = this.reposts ? this.reposts.count : "?";
                var comments = this.comments ? this.comments.count : "?";
                p.find(".views").text(views);
                p.find(".likes").text(likes);
                p.find(".reposts").text(reposts);
                p.find(".comments").text(comments);
                p.find(".time").text(time);
                p.find(".id").text(this.id);
                p.find(".text").text(this.text);
                p.data("id", this.id);
                p.data("time", time);

                $(this.attachments).each(function () {
                    var att = $('<p>');
                    if (this.type == 'photo') {
                        var src;
                        var size = self.pic_size;
                        while (size >= 0) {
                            if (this.photo.sizes[size]) {
                                src = this.photo.sizes[size].url;
                                break;
                            }
                            size -= 1;
                        }
                        var pp = $("#photo_example")
                            .clone()
                            .removeAttr('id')
                            .removeClass('invisible');
                        pp.find('img').attr('src', src);
                        att.append(pp);
                    } else if (this.type == 'link') {
                        var a = $('<a>');
                        a.attr('href', this.link.url).text(this.link.title);
                        a.appendTo(att);
                    } else if (this.type == 'video') {
                        var src = this.video.photo_1280;
                        var pp = $("#photo_example")
                            .clone()
                            .removeAttr('id')
                            .removeClass('invisible');
                        pp.find('img').attr('src', src);
                        att.append('Video: ')
                        att.append(pp);
                    } else if (this.type == 'audio') {
                        att.append('Audio: ' + this.audio.artist + ' - ' + this.audio.title);
                    } else {
                        att.text(this.type);
                        console.log(this.type, this);
                    }
                    att.appendTo(p);
                });

                p.append('<p>Comments:</p>');
                comments_el.appendTo(p);
                p.append('<p>Likes:</p>');
                likes_el.appendTo(p);
                p.appendTo('#content');
            });
            if (c + r.response.items.length < nr_posts_limit) {
                self.load(c + r.response.items.length)
                return;
            }
            // comment "return" to download zip
            return;

            var time = new Date();
            var options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
            time = time.toLocaleDateString('ru-RU', options);
            time = time.replace(/:/g, "_");
            var name = "vk_dump_" + time;
            var zip = new JSZip();
            var folder = zip.folder(name);
            var content_html = $('<body>');
            $('style').clone().appendTo(content_html);
            var cont = $('#content').clone(true);
            var i = 1;
            var count = cont.find("img").length;
            cont.find('img').each(function(k, img) {
                var p = $(img).parents(".post")[0];
                var id = $(p).data('id');
                var time = $(p).data('time');
                time = time.replace(/:/g, "_");
                toDataURL($(img).attr('src'), function(dataURL){
                    var img_folder_name = time + " " + id;
                    var img_folder = folder.folder(img_folder_name);
                    var filename = img_folder_name + " " + i + ".jpeg";
                    img_folder.file(filename, dataURL, {binary: true});
                    $(img).attr('src', img_folder_name + "/" + filename);
                    if (i == count) {
                        cont.appendTo(content_html);
                        folder.file(name + ".html", content_html.html());
                        zip.generateAsync({type:"blob"})
                            .then(function(content) {
                                saveAs(content, name + ".zip");
                            });
                    }
                    i += 1;
                })
            });
        });
    };

    $(document).ready(function () {
        VK.init({ apiId: 6746139 });
        VK.Auth.login(function (session, status) {
            var dumper = new VKDumper(101, 0);
            dumper.load();
        }, 8192);
    });

})(typeof exports === 'undefined'? this['Main']={}: exports);

