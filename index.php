<script src="https://vk.com/js/api/openapi.js?159" type="text/javascript"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script src="/js/jszip.min.js"></script>
<script src="/js/FileSaver.js"></script>
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
    <div id="stats"></div>
    <div class="invisible">
        <div id="photo_example" class="photo invisible">
            <img />
        </div>
        <div id="post_example" class="post invisible">
            <p>ID: <span class="id"></span></p>
            <p>From: <span class="from"></span></p>
            <p>Time: <span class="time"></span></p>
            <p class="_views invisible">Views: <span class="views"></span></p>
            <p class="_likes invisible">Likes: <span class="likes"></span></p>
            <p class="_comments invisible">Comments: <span class="comments"></span></p>
            <p class="_reposts invisible">Reposts: <span class="reposts"></span></p>
            <p class="_text invisible">Text: <span class="text"></span></p>
            <p class="debug"></p>
        </div>
    </div>
    <div id="download">Download</div>
    <div id="content"></div>
</body>

<?

header("Set-Cookie", "HttpOnly;Secure;SameSite=Strict");

