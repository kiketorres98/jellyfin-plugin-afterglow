namespace Jellyfin.Plugin.Afterglow.Injection;

/// <summary>What File Transformation hands to a callback: the page as text (it fills the property from the JSON field "contents").</summary>
public class PatchRequestPayload
{
    public string? Contents { get; set; }
}

/// <summary>Adds the Afterglow script to the web client's index.html. Called by the File Transformation plugin.</summary>
public static class IndexTransformer
{
    private const string Marker = "/Afterglow/afterglow.js";
    private const string StyleMarker = "/Afterglow/afterglow.css";

    // Public, static, string in, string out: File Transformation finds it by name with reflection.
    public static string Inject(PatchRequestPayload payload)
    {
        string page = payload.Contents ?? string.Empty;
        if (page.Length == 0 || page.Contains(Marker, StringComparison.Ordinal) || !LooksLikeHtmlPage(page))
        {
            return page;
        }

        // Relative, so it works under a base path too (the page is served from /web/).
        // The build id is part of the address, so every new build is fetched fresh instead of a copy a cache kept.
        var assembly = typeof(IndexTransformer).Assembly;
        string version = (assembly.GetName().Version?.ToString() ?? "0") + "-" + assembly.ManifestModule.ModuleVersionId.ToString("N")[..8];
        string script = $"<script defer src=\"..{Marker}?v={version}\"></script>";
        string style = $"<link rel=\"stylesheet\" href=\"..{StyleMarker}?v={version}\">";

        // The stylesheet goes in the head (known before the page is drawn), the script at the end of the body.
        int headEnd = page.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        if (headEnd >= 0)
        {
            page = page.Insert(headEnd, style);
        }
        else
        {
            script = style + script;
        }

        int end = page.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return end >= 0 ? page.Insert(end, script) : page + script;
    }

    // The loose file pattern also reaches scripts such as "session-login-index-html.<hash>.chunk.js":
    // those must come back untouched, a <script> tag inside JavaScript is a syntax error.
    private static bool LooksLikeHtmlPage(string text) =>
        text.TrimStart().StartsWith('<') && text.Contains("<html", StringComparison.OrdinalIgnoreCase);
}
