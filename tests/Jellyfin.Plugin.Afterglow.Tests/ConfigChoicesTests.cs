using Jellyfin.Plugin.Afterglow.Configuration;
using Xunit;

namespace Jellyfin.Plugin.Afterglow.Tests;

public class ConfigChoicesTests
{
    [Theory]
    [InlineData("top", "top")]
    [InlineData("afterContinue", "afterContinue")]
    [InlineData("end", "end")]
    public void A_known_top_ten_position_is_kept(string given, string expected)
    {
        Assert.Equal(expected, ConfigChoices.TopTenPosition(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("somewhere else")]
    [InlineData("<script>")]
    public void An_unknown_top_ten_position_becomes_the_default(string? given)
    {
        Assert.Equal("top", ConfigChoices.TopTenPosition(given));
    }

    [Theory]
    [InlineData("bottomLeft")]
    [InlineData("bottomRight")]
    [InlineData("topLeft")]
    public void A_known_quality_corner_is_kept(string given)
    {
        Assert.Equal(given, ConfigChoices.QualityCorner(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("topRight")]
    [InlineData("\"; alert(1)")]
    public void An_unknown_quality_corner_becomes_the_default(string? given)
    {
        Assert.Equal("bottomLeft", ConfigChoices.QualityCorner(given));
    }

    [Theory]
    [InlineData("books", new[] { "books" })]
    [InlineData("Books, livetv", new[] { "books", "livetv" })]
    [InlineData(" books , BOOKS , livetv ", new[] { "books", "livetv" })]
    [InlineData("books,livetv,books", new[] { "books", "livetv" })]
    public void Known_extra_rail_kinds_are_kept(string given, string[] expected)
    {
        Assert.Equal(expected, ConfigChoices.ExtraRailViews(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("garbage")]
    [InlineData("books;garbage")]
    [InlineData("<script>alert(1)</script>")]
    public void Unknown_or_empty_extra_rail_kinds_are_dropped(string? given)
    {
        Assert.Empty(ConfigChoices.ExtraRailViews(given));
    }
}
