"""Bangun Index.html dari Index.src.html.

Apps Script (HtmlService) mengolah ulang <script> inline dan bisa merusak JavaScript modern
(mis. teks setelah "//" di dalam string seperti "https://…"), sehingga halaman macet di layar memuat.
Karena itu skrip aplikasi dikompres (DEFLATE), dibungkus base64url (hanya A-Z a-z 0-9 - _),
lalu dibuka dan dijalankan browser saat halaman dimuat (pembuka kompresi: vendor/inflate.min.js).
Cara yang sama dipakai aplikasi Dokumen Penyumpahan.
Jalankan: python3 build.py   (edit tampilan di Index.src.html, jangan di Index.html)
"""
import base64, pathlib, zlib
root = pathlib.Path(__file__).parent
src = (root / 'Index.src.html').read_text(encoding='utf-8')
i = src.rindex('<script>') + len('<script>')
j = src.rindex('</script>')
js = src[i:j]


def b64(data):
    return base64.urlsafe_b64encode(data).decode('ascii').rstrip('=')


kompres = zlib.compressobj(9, zlib.DEFLATED, -15)
data = kompres.compress(js.encode('utf-8')) + kompres.flush()
inflate = (root / 'vendor' / 'inflate.min.js').read_bytes()
loader = ("(function(){function d(b){b=b.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';"
          "var r=atob(b),u=new Uint8Array(r.length);for(var k=0;k<r.length;k++)u[k]=r.charCodeAt(k);return u}"
          "var t=new TextDecoder('utf-8');function j(x){var s=document.createElement('script');s.text=x;document.body.appendChild(s)}"
          "j(t.decode(d('" + b64(inflate) + "')));j(t.decode(window.__inflate(d('" + b64(data) + "'))));})();")
out = src[:i] + loader + src[j:]
(root / 'Index.html').write_text(out, encoding='utf-8')
print('Index.html dibuat:', len(out), 'byte')
