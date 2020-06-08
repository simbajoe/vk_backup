<script src="https://vk.com/js/api/openapi.js?159" type="text/javascript"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script src="/js/jszip.min.js"></script>
<script src="/js/FileSaver.js"></script>
<script src="/js/sample.js"></script>
<script src="/js/main.js"></script>
<style>
    .post {
        border: 1px solid black;
        padding: 10px;
        margin: 10px;
    }
    .invisible {
        display: none;
    }
</style>
<body>
    <div id="photo_example" class="photo invisible">
        <img />
    </div>
    <div id="post_example" class="post invisible">
        <p>ID: <span class="id"></span></p>
        <p>From: <span class="from"></span></p>
        <p>Time: <span class="time"></span></p>
        <p>Views: <span class="views"></span></p>
        <p>Likes: <span class="likes"></span></p>
        <p>Comments: <span class="comments"></span></p>
        <p>Reposts: <span class="reposts"></span></p>
        <p>Text: <span class="text"></span></p>
        <p class="debug"></p>
    </div>
    <div id="content"></div>
    <textarea cols="50" rows="10"></textarea>
    <div id="download">Download</div>
</body>

