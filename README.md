gemini-coverage
===============

Утилита для генерации html отчета на основе json отчета о покрытии тестами [gemini](http://github.com/bem/gemini).

Использование
-----

    npm install gemini-coverage
    ./node_modules/.bin/gemini-coverage gen [путь к coverage.json]

По умолчанию файлы отчета будут сохранены в [текущая директори/gemini-coverage].

**Опции**

Создать отчет в папке path/to/report, использовать исходные файлы из path/to/source

```
./node_modules/.bin/gemini-coverage gen -r path/to/source -d path/to/report [путь к coverage.json]
```
