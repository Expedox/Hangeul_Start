# Hangeul Start

Koreanisch von null an lernen, in vier Stufen: Buchstaben, Silben, erste Wörter und Sätze, Alltag. Oberfläche auf Deutsch und Englisch. Statische Web-App ohne Build-Schritt, der Lernstand bleibt im Browser (localStorage).

## Online stellen (GitHub Pages)

1. Den Inhalt dieses Ordners in ein GitHub-Repository hochladen (die Dateien liegen direkt im Hauptverzeichnis).
2. Im Repository unter **Settings → Pages** als Quelle „Deploy from a branch“, Branch `main`, Ordner `/ (root)` wählen.
3. Nach kurzer Zeit läuft die App unter `https://<name>.github.io/<repository>/`.

## Lokal starten

Browser laden JSON-Dateien nicht direkt von der Festplatte. Im Ordner einen kleinen Webserver starten, z. B. `py -m http.server 8123`, und http://localhost:8123/ öffnen.

## Aufbau

```
index.html        Gerüst
css/style.css     Aussehen
js/               App-Logik (ES-Module)
lang/             Oberflächentexte de/en
data/             Kurs, Lektionen (eine JSON-Datei pro Lektion), Buchstabentabelle
audio/            Aufnahmen; abgespielt wird nur, was in audio/manifest.json steht
```

Die Lautschrift folgt der offiziellen koreanischen Umschrift (Revised Romanization), geschrieben wie gesprochen.

## Audio ergänzen

Datei als `audio/<id>.mp3` ablegen (id wie in den Lektionsdateien, Silben im Baukasten als `audio/syllables/<Silbe>.mp3`) und den Pfad in `audio/manifest.json` eintragen.
