using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.Afterglow.Configuration;

/// <summary>What the settings page switches on and off; the script reads it from /Afterglow/config.</summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets a value indicating whether posters get small "4K" / "HDR" / "Dolby Vision" marks.</summary>
    public bool QualityMarks { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether the sections menu is a rail of icons down the left side.</summary>
    public bool SideMenu { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether the home page opens with the billboard of featured titles.</summary>
    public bool Hero { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether the home page has the "top 10" shelf.</summary>
    public bool TopTen { get; set; } = true;

    /// <summary>Gets or sets a value indicating whether the "what shall we watch tonight" button is offered.</summary>
    public bool Tonight { get; set; } = true;

    /// <summary>Gets or sets where the top 10 shelf goes: "top" (under the billboard), "afterContinue" or "end".</summary>
    public string TopTenPosition { get; set; } = "top";

    /// <summary>Gets or sets the corner of the posters for the quality marks: "bottomLeft", "bottomRight" or "topLeft".</summary>
    public string QualityCorner { get; set; } = "bottomLeft";
}
