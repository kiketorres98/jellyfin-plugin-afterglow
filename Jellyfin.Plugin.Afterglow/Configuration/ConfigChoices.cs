namespace Jellyfin.Plugin.Afterglow.Configuration;

/// <summary>The values the settings page offers for the "where" choices; anything else falls back to the default.</summary>
public static class ConfigChoices
{
    private static readonly string[] TopTenPositions = ["top", "afterContinue", "end"];
    private static readonly string[] QualityCorners = ["bottomLeft", "bottomRight", "topLeft"];

    /// <summary>Where the top 10 shelf goes on the home page.</summary>
    /// <param name="value">What was saved.</param>
    /// <returns>"top", "afterContinue" or "end".</returns>
    public static string TopTenPosition(string? value) => Pick(value, TopTenPositions);

    /// <summary>Which corner of a poster the quality marks sit in.</summary>
    /// <param name="value">What was saved.</param>
    /// <returns>"bottomLeft", "bottomRight" or "topLeft".</returns>
    public static string QualityCorner(string? value) => Pick(value, QualityCorners);

    private static string Pick(string? value, string[] allowed) =>
        allowed.FirstOrDefault(option => string.Equals(option, value, StringComparison.Ordinal)) ?? allowed[0];
}
