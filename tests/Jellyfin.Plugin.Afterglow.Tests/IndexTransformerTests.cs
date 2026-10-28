using Jellyfin.Plugin.Afterglow.Injection;
using System.Text.RegularExpressions;
using Xunit;

namespace Jellyfin.Plugin.Afterglow.Tests;

public class IndexTransformerTests
{
    private const string Page = "<html><head><title>Jellyfin</title></head><body><div id=\"reactRoot\"></div></body></html>";

    [Fact]
    public void Adds_the_script_just_before_the_end_of_the_page()
    {
        string result = IndexTransformer.Inject(new PatchRequestPayload { Contents = Page });

        Assert.Contains("<script defer src=\"../Afterglow/afterglow.js?v=", result);
        Assert.True(result.IndexOf("afterglow.js", StringComparison.Ordinal) < result.IndexOf("</body>", StringComparison.Ordinal));
    }

    [Fact]
    public void Adds_the_stylesheet_in_the_head_so_the_page_does_not_flash_unstyled()
    {
        string result = IndexTransformer.Inject(new PatchRequestPayload { Contents = Page });

        Assert.Contains("<link rel=\"stylesheet\" href=\"../Afterglow/afterglow.css?v=", result);
        Assert.True(result.IndexOf("afterglow.css", StringComparison.Ordinal) < result.IndexOf("</head>", StringComparison.Ordinal));
    }

    [Fact]
    public void Adds_it_only_once_even_if_asked_twice()
    {
        string once = IndexTransformer.Inject(new PatchRequestPayload { Contents = Page });
        string twice = IndexTransformer.Inject(new PatchRequestPayload { Contents = once });

        Assert.Equal(once, twice);
    }

    [Fact]
    public void Leaves_the_rest_of_the_page_untouched()
    {
        string result = IndexTransformer.Inject(new PatchRequestPayload { Contents = Page });

        Assert.Contains("<div id=\"reactRoot\"></div>", result);
        Assert.StartsWith("<html><head><title>Jellyfin</title>", result);
        Assert.Contains("</head><body><div id=\"reactRoot\"></div>", result);
    }

    [Fact]
    public void A_page_without_a_body_end_gets_the_script_at_the_end_instead_of_being_lost()
    {
        string result = IndexTransformer.Inject(new PatchRequestPayload { Contents = "<html>no body tag" });

        Assert.Contains("afterglow.js", result);
    }

    [Fact]
    public void A_script_file_whose_name_looks_like_the_start_page_is_left_alone()
    {
        // The web client has "session-login-index-html.<hash>.chunk.js": the loose pattern matches it too,
        // and adding a <script> tag to JavaScript breaks the login page.
        const string chunk = "\"use strict\";(self.webpackChunk=self.webpackChunk||[]).push([[1],{2:function(t){t.exports='<div id=\"loginPage\"></div>'}}]);";

        Assert.Equal(chunk, IndexTransformer.Inject(new PatchRequestPayload { Contents = chunk }));
    }

    [Fact]
    public void Empty_or_missing_contents_do_not_break_the_page_load()
    {
        Assert.Equal(string.Empty, IndexTransformer.Inject(new PatchRequestPayload { Contents = null }));
        Assert.Equal(string.Empty, IndexTransformer.Inject(new PatchRequestPayload { Contents = string.Empty }));
    }

    [Theory]
    [InlineData("index.html")]
    [InlineData("web/index.html")]
    [InlineData("/web/index.html")]
    public void The_pattern_finds_the_start_page_however_the_server_names_it(string path)
    {
        Assert.Matches(new Regex(StartupRegistrar.FileNamePattern), path);
    }

    [Theory]
    [InlineData("main.jellyfin.bundle.js")]
    [InlineData("web/avatars/list.txt")]
    public void The_pattern_leaves_other_files_alone(string path)
    {
        Assert.DoesNotMatch(new Regex(StartupRegistrar.FileNamePattern), path);
    }
}
