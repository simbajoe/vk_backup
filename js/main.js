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

    var VKDumper = exports.VKDumper = function (from, nr_posts_limit, pic_size) {
        this.from = from;
        this.nr_posts_limit = nr_posts_limit;
        this.pic_size = pic_size;
        this.wall = [];
        this.stats = {};
        this.months = [];
    };

    VKDumper.prototype.get_wall_req = function (count, offset, cb) {
        console.log('get_wall_req', count, offset);
        var self = this;
        var query = "return [";
        while (count > 0) {
            var gw_count = Math.min(100, count);
            query += "API.wall.get({ count: " + gw_count + ", offset: " + offset + ', extended: 1, fields: "first_name,last_name"})'
            offset += gw_count;
            count -= gw_count;
            if (count > 0) {
                query += ", ";
            }
        }
        query += "];";
        VK.Api.call('execute', {
            code: query,
            v: "5.87"
        }, function (r) {
            console.log(query, r);
            $(r.response).each(function (index_req, req) {
                var items = req.items;
                $(items).each(function (index_item, item) {
                    item.profiles = req.profiles;
                });
                self.wall = self.wall.concat(items);
            });
            self.nr_iterations -= 1;
            if (self.nr_iterations == 0) {
                self.get_likes(cb);
            }
        });
    };

    VKDumper.prototype.get_likes_req = function (count, offset, cb) {
        var self = this;
        var orig_count = count;
        var orig_offset = offset;
        var query = "return [";
        while (count > 0) {
            var post = self.wall[offset];
            query += '[' + offset + ', API.likes.getList({ type: "post", item_id: ' + post.id + ', extended: 1})]'
            offset += 1;
            count -= 1;
            if (count > 0) {
                query += ", ";
            }
        }
        query += "];";
        VK.Api.call('execute', {
            code: query,
            v: "5.87"
        }, function (r) {
            if (r.error) {
                if (r.error.error_code == 6) {
                    var timeout = Math.floor(Math.random() * 2 * self.nr_iterations * 1000 / 10);
                    console.log('likes timeout', self.nr_iterations, orig_offset, orig_count, timeout);
                    setTimeout(function () {
                        self.get_likes_req(orig_count, orig_offset, cb);
                    }, timeout);
                } else {
                    console.log(r);
                }
                return;
            }
            $(r.response).each(function (index, value) {
                var post_offset = value[0];
                var likes = value[1];
                self.wall[post_offset].likes = likes;
            });
            self.nr_iterations -= 1;
            if (self.nr_iterations == 0) {
                self.get_comments(cb);
            }
        });
    };

    VKDumper.prototype.get_comments_req = function (count, offset, cb) {
        var self = this;
        var orig_count = count;
        var orig_offset = offset;
        var query = "return [";
        while (count > 0) {
            var post = self.wall[offset];
            query += '[' + offset + ', API.wall.getComments({ count: 100, preview_length: 0, need_likes: 1, fields: "first_name,last_name", post_id: ' + post.id + ', extended: 1})]'
            offset += 1;
            count -= 1;
            if (count > 0) {
                query += ", ";
            }
        }
        query += "];";
        VK.Api.call('execute', {
            code: query,
            v: "5.87"
        }, function (r) {
            if (r.error) {
                if (r.error.error_code == 6) {
                    var timeout = Math.floor(Math.random() * self.nr_iterations * 1000 / 10);
                    console.log('comments timeout', self.nr_iterations, orig_offset, orig_count, timeout);
                    setTimeout(function () {
                        self.get_comments_req(orig_count, orig_offset, cb);
                    }, timeout);
                } else {
                    console.log(r);
                }
                return;
            }
            $(r.response).each(function (index, value) {
                var post_offset = value[0];
                var comments = value[1];
                self.wall[post_offset].comments = comments;
            });
            self.nr_iterations -= 1;
            if (self.nr_iterations == 0) {
                cb();
            }
        });
    };

    VKDumper.prototype.get_stat_req = function (offset, cb) {
        var self = this;
        var orig_offset = offset;
        var query = "return [";
        var count = 1000;
        while (count > 0) {
            var gw_count = Math.min(100, count);
            query += "API.wall.get({ count: " + gw_count + ", offset: " + offset + ', extended: 1, fields: "first_name,last_name"})'
            offset += gw_count;
            count -= gw_count;
            if (count > 0) {
                query += ", ";
            }
        }
        query += "];";
        VK.Api.call('execute', {
            code: query,
            v: "5.87"
        }, function (r) {
            console.log(query, r);
            if (r.error && r.error.error_code == 6) {
                // Too many requests per second
                console.log('timeout');
                setTimeout(function () { self.get_stat_req(offset, cb)}, 1000);
            } else {
                var processed = 0
                $(r.response).each(function (index_req, req) {
                    var items = req.items;
                    $(items).each(function (index_item, item) {
                        processed += 1;
                        console.log(item);
                        var date = new Date(item.date * 1000);
                        var year = date.toISOString().slice(0, 4);
                        var month = date.toISOString().slice(0, 7);
                        var month_read = date.toLocaleDateString(undefined, { month: 'long' });
                        if (!(year in self.stats)) {
                            self.stats[year] = {
                                months: {},
                                from: undefined,
                                to: undefined
                            };
                        }
                        if (!(month in self.stats[year].months)) {
                            self.stats[year].months[month] = {
                                name: month_read,
                                items: [],
                                from: undefined,
                                to: undefined
                            };
                        }
                        self.stats[year].months[month].items.push(item);
                        var global_index = orig_offset + index_req * gw_count + index_item;
                        if (typeof(self.stats[year].from) === 'undefined' || global_index < self.stats[year].from) {
                            self.stats[year].from = global_index;
                        }
                        if (typeof(self.stats[year].to) === 'undefined' || global_index > self.stats[year].to) {
                            self.stats[year].to = global_index;
                        }
                        if (typeof(self.stats[year].months[month].from) === 'undefined' || global_index < self.stats[year].months[month].from) {
                            self.stats[year].months[month].from = global_index;
                        }
                        if (typeof(self.stats[year].months[month].to) === 'undefined' || global_index > self.stats[year].months[month].to) {
                            self.stats[year].months[month].to = global_index;
                        }
                    });
                });
                console.log("processed", processed);
                if (processed) {
                    self.get_stat_req(offset, cb);
                } else {
                    cb();
                }
            }
        });
    };

    VKDumper.prototype.get_wall = function (cb) {
        var max_count = 1000;
        var nr_posts = this.nr_posts_limit;
        var from = this.from;
        this.nr_iterations = Math.ceil(nr_posts / max_count);
        while (from < this.from + nr_posts) {
            var count = Math.min(max_count, this.from + nr_posts - from);
            this.get_wall_req(count, from, cb);
            from += count;
        }
    }

    VKDumper.prototype.get_likes = function (cb) {
        var offset = 0;
        var max_count = 25;
        var nr_posts = this.wall.length;
        this.nr_iterations = Math.ceil(nr_posts / max_count);
        while (offset < nr_posts) {
            var count = Math.min(max_count, nr_posts - offset);
            this.get_likes_req(count, offset, cb);
            offset += count;
        }
    }

    VKDumper.prototype.get_comments = function (cb) {
        var offset = 0;
        var max_count = 25;
        var nr_posts = this.wall.length;
        this.nr_iterations = Math.ceil(nr_posts / max_count);
        while (offset < nr_posts) {
            var count = Math.min(max_count, nr_posts - offset);
            this.get_comments_req(count, offset, cb);
            offset += count;
        }
    }

    VKDumper.prototype.render = function () {
        var self = this;
        self.wall.sort(function (a, b) { return a.id - b.id });
        $(self.wall).each(function (index_post, post) {
            var p = $("#post_example")
                .clone()
                .removeAttr('id')
                .removeClass('invisible');
            var time = new Date(post.date * 1000);

            var options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
            time = time.toLocaleDateString('ru-RU', options);
            var views = post.views ? post.views.count : "?";
            var likes = post.likes ? post.likes.length : "?";
            var reposts = post.reposts ? post.reposts.count : "?";
            var comments = post.comments ? post.comments.length : "?";
            var profiles = post.profiles.reduce(function(map, obj) {
                    map[obj.id] = obj.first_name + " " + obj.last_name;
                    return map;
            }, {});
            p.find(".from").text(profiles[post.from_id]);
            p.find(".views").text(views);
            p.find(".likes").text(likes);
            p.find(".reposts").text(reposts);
            p.find(".comments").text(comments);
            p.find(".time").text(time);
            p.find(".id").text(post.id);
            p.find(".text").text(post.text);
            /*p.find(".debug").text(JSON.stringify(post, undefined, 4));*/
            p.data("id", post.id);
            p.data("time", time);

            $(post.attachments).each(function (index_attachment, attachment) {
                var att = $('<p>');
                if (attachment.type == 'photo') {
                    var src;
                    var size = self.pic_size;
                    while (size >= 0) {
                        if (attachment.photo.sizes[size]) {
                            src = attachment.photo.sizes[size].url;
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
                } else if (attachment.type == 'link') {
                    var a = $('<a>');
                    a.attr('href', attachment.link.url).text(attachment.link.title);
                    a.appendTo(att);
                } else if (attachment.type == 'video') {
                    var src = attachment.video.photo_1280;
                    var pp = $("#photo_example")
                        .clone()
                        .removeAttr('id')
                        .removeClass('invisible');
                    pp.find('img').attr('src', src);
                    att.append('Video: ')
                    att.append(pp);
                } else if (attachment.type == 'audio') {
                    att.append('Audio: ' + attachment.audio.artist + ' - ' + attachment.audio.title);
                } else {
                    att.text(attachment.type);
                    console.log("Unexpected attachment type", attachment.type, attachment);
                }
                att.appendTo(p);
            });

            var comments_el = $('<ul>');
            var likes_el = $('<ul>');
            {
                var profiles = post.comments.profiles.reduce(function(map, obj) {
                        map[obj.id] = obj.first_name + " " + obj.last_name;
                        return map;
                }, {});
                $(post.comments.items).each(function (index_comment, comment) {
                    var comment_el = $('<li>');
                    comment_el.text(comment.text + " - " + profiles[comment.from_id]);
                    comment_el.appendTo(comments_el);
                });
                $(post.likes.items).each(function (index_like, like) {
                    var like_el = $('<li>');
                    like_el.text(like.first_name + " " + like.last_name);
                    like_el.appendTo(likes_el);
                });
            }
            p.append('<p>Comments:</p>');
            comments_el.appendTo(p);
            p.append('<p>Likes:</p>');
            likes_el.appendTo(p);
            p.appendTo('#content');
        });
    };

    VKDumper.prototype.load = function (c) {
        var self = this;
        console.log('start');
        self.get_wall(function () {
            /*$('#content').css({"display": "none"});*/
            self.render();
            $('#download').css({"font-weight": "bold", "cursor": "pointer"});
        });
        /*(function () {*/
        /*self.wall = exports.sample;*/
        /*self.render();*/
        /*})();*/
    };

    VKDumper.prototype.download = function (c) {
        console.log('here');
        var self = this;
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
            console.log('here');
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
    };

    VKDumper.prototype.render_stats = function () {
        var self = this;
        var years = Object.getOwnPropertyNames(self.stats);
        years.sort();
        for (var i in years) {
            var year_key = years[i];
            var year = self.stats[year_key];
            var year_el = $('<p>');
            var year_el_a = $('<a>');
            var total = year.to - year.from + 1;
            year_el_a.text(year_key + ' (' + total + ')');
            year_el_a.attr("href", "/?from=" + year.from + '&limit=' + total );
            year_el_a.attr("target", "_blank");
            year_el.append(year_el_a);
            $('#stats').append(year_el);
            var ul = $('<ul>');
            var months = Object.getOwnPropertyNames(self.stats[year_key].months);
            months.sort();
            for (var j in months) {
                var month_key = months[j];
                var month = self.stats[year_key].months[month_key];
                var li = $('<li>');
                var month_el_a = $('<a>');
                var m_total = month.to - month.from + 1;
                month_el_a.text(month.name + ' (' + m_total + ')');
                month_el_a.attr("href", "/?from=" + month.from + '&limit=' + m_total );
                month_el_a.attr("target", "_blank");
                li.append(month_el_a);
                ul.append(li);
            }
            $('#stats').append(ul);
        }
    };

    $(document).ready(function () {
        const urlParams = new URLSearchParams(window.location.search);
        var from = parseInt(urlParams.get('from'));
        var limit = parseInt(urlParams.get('limit'));
        console.log(from, limit);
        VK.init({ apiId: 6746139 });
        VK.Auth.login(function (session, status) {
            var dumper = new VKDumper(from, limit, 8);
            if (!isNaN(from) && !isNaN(limit)) {
                console.log('here');
                dumper.load();
            } else {
                console.log('there');
                dumper.get_stat_req(0, function () {
                    console.log("done");
                    dumper.render_stats();
                });
            }
            exports.VKDumper = dumper;
        }, 8192);
        $('#download').click(function () {
            exports.VKDumper.download();
        });
    });

})(typeof exports === 'undefined'? (this['Main'] || (this['Main']={})) : exports);


