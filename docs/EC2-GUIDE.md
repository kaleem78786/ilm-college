# ILM College — EC2 deployment guide (Roman Urdu)

Yeh chhoti static website hai: HTML, CSS aur JavaScript. Database, Node.js ya paid theme ki zaroorat nahi. Website EC2 par Nginx serve karega. Yeh reproducible deployment instructions hain; actual deployment aur HTTPS verification ka latest status [README.md](../README.md) mein dekhein.

## Aapke existing EC2 ka quick start

Aapka server **54.81.201.196**, domain **lunphudi.com**, aur SSH key **`~/Downloads/first-test.pem`** hai. Naya EC2 banane ki zaroorat nahi. Key local Downloads mein rehni chahiye; ZIP, website ya server par upload na karein.

**Laptop terminal:**

```bash
cd /home/kaleem/new-project/ilm-college
chmod 400 ~/Downloads/first-test.pem
ssh -i ~/Downloads/first-test.pem ubuntu@ec2-54-81-201-196.compute-1.amazonaws.com "mkdir -p /home/ubuntu/ilm-college-upload"
scp -i ~/Downloads/first-test.pem -r site deploy ubuntu@ec2-54-81-201-196.compute-1.amazonaws.com:/home/ubuntu/ilm-college-upload/
ssh -i ~/Downloads/first-test.pem ubuntu@ec2-54-81-201-196.compute-1.amazonaws.com
```

**EC2 terminal:**

```bash
cd /home/ubuntu/ilm-college-upload
bash deploy/setup-ec2.sh 54.81.201.196
```

**HTTP deployment verify ho chuki hai:** `http://54.81.201.196`. Domain ke liye Nginx mein `server_name 54.81.201.196 lunphudi.com;` chahiye. `www.lunphudi.com` ka DNS record abhi missing hai; use live na samjhein. Aapke domain ka specific HTTPS procedure section 7 mein hai; HTTPS ki actual verification [README.md](../README.md) mein dekhein. Existing HTTPS config setup repeat karne par preserve hoti hai. Neeche generic commands mein `PUBLIC_IPV4` = `54.81.201.196`, `yourdomain.com` = `lunphudi.com`, aur key path = `~/Downloads/first-test.pem` use karein.

## 1. Tayari aur cost

- AWS account, laptop terminal, internet aur downloaded project ZIP chahiye. ZIP extract karein; `ilm-college/` ke andar `site/`, `deploy/` aur `docs/` honge.
- AWS Billing mein credits/Free Tier eligibility aur region ki instance price check karein. Free hosting guarantee nahi: 15 July 2025 se naye accounts ki benefits credits aur account plan par depend karti hain; free plan 6 months ya credits khatam hone tak hai. Purane accounts ki eligibility alag hai. [AWS Free Tier rules](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).
- EC2 compute, EBS storage, public IPv4, data transfer aur domain se charges aa sakte hain. Public IPv4/Elastic IP ki listed rate **$0.005 per hour** hai: 30 din ke 720 hours ka **$3.60**, credits/tax aur baqi services se pehle. Attached aur idle IPv4 dono charge ho sakte hain. [AWS IPv4 pricing](https://aws.amazon.com/vpc/pricing/).
- Billing → Budgets mein chhota cost budget aur email alert set karein; alert spending ko automatically stop nahi karta.

## 2. EC2 instance banayein

AWS Console → EC2 → **Launch instance**:

| Setting | Kya select karna hai |
| --- | --- |
| Name | `ilm-college-web` |
| AMI | **Ubuntu Server 24.04 LTS**, publisher Canonical, x86_64 |
| Instance type | `t3.micro`; region mein available na ho to `t2.micro` (price/eligibility pehle check) |
| Key pair | Create → RSA → `.pem`; naam `ilm-college-key`, file safely download |
| Network | Default VPC + public subnet; **Auto-assign public IP: Enable** |
| Security group | Naya group `ilm-college-web-sg`, neeche wale rules |
| Storage | 8 GiB gp3 root volume; **Delete on termination** check karein |
| Advanced details | T3 ke liye Credit specification **Standard** rakhein; credits khatam par performance limit ho sakti hai |

T3 Unlimited mode mein extra CPU credit charges aa sakte hain. [AWS CPU credit modes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html).

**Inbound rules:**

| Type | Port | Source |
| --- | --- | --- |
| SSH | TCP 22 | **My IP** (`aap-ka-public-IP/32`) |
| HTTP | TCP 80 | Anywhere IPv4 (`0.0.0.0/0`) |
| HTTPS | TCP 443 | SSL configure karne ke baad Anywhere IPv4 (`0.0.0.0/0`) |

Outbound rules default rehne dein. Yeh guide IPv4 use karti hai; IPv6 rules zaroori nahi. SSH ko Anywhere na rakhein. Internet/network change hone par SSH rule mein **My IP** update karein. [AWS security group rules](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html).

**Launch instance** karein. `Running` aur status checks pass hone ka intezar karein; Details se **Public IPv4 address** copy karein. Agar default VPC nahi hai, public subnet ke route table mein `0.0.0.0/0 → Internet Gateway` aur attached gateway chahiye. [AWS launch guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html).

## 3. Laptop se SSH aur files upload

Commands **apne laptop** ke Linux/macOS/WSL terminal mein chalayein. `PUBLIC_IPV4` har jagah EC2 ke asli IP se replace karein; key path apni `.pem` ka dein. Key file project ya website folder mein na rakhein.

```bash
chmod 400 ~/Downloads/ilm-college-key.pem
ssh -i ~/Downloads/ilm-college-key.pem ubuntu@PUBLIC_IPV4
```

Pehli connection par fingerprint AWS console ke instance system log se match karein, phir `yes` likhein. Ubuntu AMI ka username **ubuntu** hai. [AWS SSH guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-ssh.html).

EC2 terminal mein upload directory banayein, phir laptop par wapas aayein:

```bash
mkdir -p /home/ubuntu/ilm-college-upload
exit
```

Laptop par extracted `ilm-college/` folder open karke:

```bash
cd /path/to/ilm-college
scp -i ~/Downloads/ilm-college-key.pem -r site deploy ubuntu@PUBLIC_IPV4:/home/ubuntu/ilm-college-upload/
ssh -i ~/Downloads/ilm-college-key.pem ubuntu@PUBLIC_IPV4
```

Windows native PowerShell mein `ssh`/`scp` use ho sakte hain; key path misal `C:\Users\YourName\Downloads\ilm-college-key.pem` hoga. `chmod` Linux/macOS/WSL ke liye hai; Windows key permissions ke liye linked AWS SSH guide follow karein.

## 4. EC2 par website install

Ab commands **EC2 terminal** mein:

```bash
cd /home/ubuntu/ilm-college-upload
bash deploy/setup-ec2.sh PUBLIC_IPV4
```

Script Nginx install karega, `site/` ko `/var/www/ilm-college` mein copy karega, configuration validate karega aur website enable/reload karega. `/var/www/html` aur Ubuntu ka default site preserve hote hain. Host matching ki wajah se browser mein **wahi public IP** use karein jo script ko diya tha. Nginx ki configuration `/etc/nginx/sites-available/ilm-college` mein hogi. [Ubuntu Nginx installation](https://ubuntu.com/server/docs/how-to-install-nginx/), [Nginx configuration/reload](https://nginx.org/en/docs/beginners_guide.html).

Laptop browser mein **`http://PUBLIC_IPV4`** open karein. SSL step se pehle `http://` use karein.

EC2 checks:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
curl -I -H 'Host: PUBLIC_IPV4' http://127.0.0.1/
```

HTTP `200 OK` aur browser mein ILM College page, mobile menu aur links verify karein. Website demo ko official publish karne se pehle college ka campus/address/contact aur actual offered programs verify/update karein. Static page mein admission submission backend/database nahi hai.

## 5. Website mein changes/update

Laptop par `site/index.html`, `site/style.css` ya `site/script.js` edit karein. Files upload karke script dobara run karein:

```bash
# Laptop: extracted project folder se
scp -i ~/Downloads/ilm-college-key.pem -r site ubuntu@PUBLIC_IPV4:/home/ubuntu/ilm-college-upload/
ssh -i ~/Downloads/ilm-college-key.pem ubuntu@PUBLIC_IPV4
```

```bash
# EC2
cd /home/ubuntu/ilm-college-upload
bash deploy/setup-ec2.sh PUBLIC_IPV4
```

Script sirf apne dedicated website folder ko sync karta hai aur existing domain/HTTPS config preserve karta hai. `scp` upload se purani remote files automatically delete nahi hotin: file remove ki ho to pehle upload directory ke andar **sirf `site/`** replace karein; doosri website files delete na karein. Browser mein hard refresh karein (`Ctrl+Shift+R`).

## 6. Optional: fixed IP aur domain

Normal public IPv4 **Stop → Start** par badal sakta hai; reboot par aam tor par nahi. Naya IP ho to SSH/upload commands update karein aur `sudo nano /etc/nginx/sites-available/ilm-college` mein `server_name` update karke `sudo nginx -t` phir `sudo systemctl reload nginx` karein. [AWS IP addressing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html).

Stable IP ke liye EC2 → Elastic IPs → Allocate → Associate with instance. Elastic IP allocate/associate ke baad us IP ko commands/config mein use karein. Elastic IP bhi paid public IPv4 hai. [AWS Elastic IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html).

Apna domain khareed kar DNS mein:

| Record | Value |
| --- | --- |
| `A`, name `@` | EC2/Elastic public IPv4 |
| `A`, name `www` | Wahi public IPv4 |

**Aapke Cloudflare records:** root domain ka A record Cloudflare par **Proxied** hai; uska content `54.81.201.196` hona chahiye. `www` ka authoritative DNS record abhi missing hai. Agar www chahiye to `A www → 54.81.201.196` add karein aur certificate/Nginx mein bhi www add karein. Same names par conflicting records replace karein; existing MX/email records preserve karein. DNS-only (grey cloud) traffic seedha EC2 bhejta hai. Proxied (orange cloud) traffic Cloudflare se EC2 aata hai aur DNS lookup Cloudflare ka IP dikhata hai; orange cloud par lookup ka EC2 IP na dikhana normal hai. Initial HTTP/certificate checks ke liye records temporary DNS-only rakh sakte hain. [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/).

Domain/example ko apne domain se replace karein. DNS propagate hone ke baad EC2 par:

```bash
sudo nano /etc/nginx/sites-available/ilm-college
```

`server_name PUBLIC_IPV4;` ko `server_name PUBLIC_IPV4 yourdomain.com www.yourdomain.com;` karein. Nano: `Ctrl+O`, Enter, `Ctrl+X`.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Domain ka HTTP page pehle verify karein. Route 53 zaroori nahi; apne domain provider ka DNS use kar sakte hain. Bina working IPv6 setup ke `AAAA` record add na karein.

## 7. Optional: HTTPS/SSL

Domain DNS sahi public IP par ho aur port 80 public HTTP working ho. Yeh steps apne domain ke liye hain; `yourdomain.com` replace karein. `www` DNS nahi banaya to commands mein `-d www.yourdomain.com` hata dein.

**EC2:**

```bash
sudo apt-get update
sudo apt-get install -y snapd
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Email/terms prompts complete karein. Agar Certbot pehle apt se install kiya hua hai, snap use karne se pehle official guide ke mutabiq old package remove karein. [Certbot official snap instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap), [Ubuntu TLS guide](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/).

Certificate/config successful hone par security group mein **HTTPS 443 → Anywhere IPv4** add karein. Agar UFW pehle se active hai to usmein bhi 443 allow karein (`sudo ufw allow 443/tcp`).

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo /snap/bin/certbot renew --dry-run
curl -I https://yourdomain.com
```

Browser mein `https://yourdomain.com` verify karein. Certbot automatic renewal configure karta hai; dry run pass hona chahiye. Port 80 renewal/HTTP redirect ke liye open rehne dein. Setup script repeat hone par Certbot wali existing config overwrite nahi hoti.

### Aapke lunphudi.com ka specific HTTPS procedure

Upar wala `--nginx` method generic hai. Is project ki domain config ke liye neeche wala **certonly/webroot** method use hota hai; pehle sirf root domain ka certificate issue hota hai. `www` ko tabhi include karein jab uska DNS record working ho. `/.well-known/acme-challenge/` HTTP par accessible rehna chahiye; supplied Nginx config is route ko allow karti hai. [Certbot webroot/renewal documentation](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot).

**EC2, certificate pehle:** Snap Certbot install hone ke baad:

```bash
sudo /snap/bin/certbot certonly --webroot -w /var/www/ilm-college \
  --non-interactive --agree-tos --register-unsafely-without-email \
  -d lunphudi.com
sudo /snap/bin/certbot certificates
```

Certificate issue successful aur `/etc/letsencrypt/live/lunphudi.com/fullchain.pem`/`privkey.pem` available hone ke **baad hi** supplied HTTPS config install karein. Yeh certificate paths hain; private key ka content docs, ZIP ya website mein include nahi hota.

```bash
cd /home/ubuntu/ilm-college-upload
sudo cp -a /etc/nginx/sites-available/ilm-college /etc/nginx/sites-available/ilm-college.before-https
sudo install -m 644 deploy/nginx-lunphudi-https.conf /etc/nginx/sites-available/ilm-college
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` fail ho to backup restore karein: `sudo cp -a /etc/nginx/sites-available/ilm-college.before-https /etc/nginx/sites-available/ilm-college`, phir test/reload karein. Certificate issue na ho to HTTP config hi rehne dein. Supplied HTTPS config mein HTTP retained hai, taa-ke Cloudflare ka existing Flexible mode redirect loop create na kare; origin HTTPS verify hone ke baad **Full (strict)** select karein.

**Automatic renewal ke baad Nginx reload:** `certonly` Nginx config/reload khud manage nahi karta. Executable deploy hook chahiye:

```bash
sudo install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
sudo install -m 755 deploy/reload-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo /snap/bin/certbot renew --dry-run --run-deploy-hooks
```

Snap timer renewal attempt karta hai; deploy hook successful renewal ke baad naya certificate Nginx mein load karta hai. [Certbot renewal hooks](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).

EC2 par valid certificate aur working port **443** verify hone ke baad Cloudflare → SSL/TLS → encryption mode **Full (strict)** set karein. Root domain par orange cloud enable reh sakta hai. Full (strict) ke liye origin certificate unexpired aur domain se matching hona chahiye. AWS security group mein **80 aur 443** allow hon; renewal ke liye 80 open rakhein. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

**Optional www:** DNS record add karne ke baad pehle Nginx ke **HTTP** `server_name` mein `www.lunphudi.com` add karein aur `sudo nginx -t && sudo systemctl reload nginx` karein, taa-ke www ka ACME challenge isi webroot se serve ho. Phir certificate expand karein: `sudo /snap/bin/certbot certonly --webroot -w /var/www/ilm-college --cert-name lunphudi.com --expand -d lunphudi.com -d www.lunphudi.com`. Uske baad **HTTPS** `server_name` mein bhi www add karein, test/reload aur www browser test karein. In steps se pehle www configured/live nahi hai.

Certbot ka Let’s Encrypt certificate EC2 origin par install hota hai aur DNS-only/Proxied dono mein browser trust deta hai. Cloudflare Origin CA certificate sirf Cloudflare trust karta hai; us alternative ke saath DNS-only/direct browser access par certificate warning aa sakti hai. [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/).

```bash
# Laptop: origin HTTPS certificate ko Cloudflare bypass karke test karein
curl -I --resolve lunphudi.com:443:54.81.201.196 https://lunphudi.com
curl -I https://lunphudi.com
```

## 8. Common problems

| Problem | Check/fix |
| --- | --- |
| SSH timeout | Instance Running, public IP, SSH My IP rule aur public subnet route check karein |
| `Permission denied (publickey)` | Sahi `.pem`, username `ubuntu`, key permissions aur instance key pair check karein |
| Browser timeout | `http://` use karein, security group port 80 aur Nginx status check karein |
| Ubuntu welcome page | `server_name` mein current IP/domain add karein; `nginx -t` pass ho to reload karein |
| `403`/`404` | `site/index.html` upload aur `/var/www/ilm-college` permissions check karein |
| HTTPS certificate fail | Domain A records, optional www record, port 80 aur DNS propagation check karein |
| Purana page | Files upload + setup repeat; browser hard refresh |

Useful EC2 commands:

```bash
sudo tail -n 40 /var/log/nginx/error.log
sudo journalctl -u nginx -n 40 --no-pager
sudo ss -ltnp
sudo ufw status
```

Script UFW enable nahi karta; AWS security group required hai. UFW agar pehle se active ho to HTTP allow karein (`sudo ufw allow 80/tcp`); SSH allow kiye baghair UFW enable na karein. [Ubuntu firewall guide](https://ubuntu.com/server/docs/how-to/security/firewalls/).

## 9. Cost control aur cleanup

Testing ke baad **Stop instance** karne se website offline hoti hai; EBS storage aur allocated Elastic IP charges reh sakte hain. Permanent removal se pehle required data backup karein, phir **Terminate instance**. Uske baad unused Elastic IP **release**, retained EBS volumes/snapshots aur separately created paid resources review/delete karein. Domain subscriptions auto-cancel nahi hotin. Billing console mein costs/credits check karte rahein. [AWS cleanup guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html#ec2-clean-up-your-instance).

Official documentation checked: **10 October 2026**. Console labels/prices future mein change ho sakte hain; launch se pehle apne account ki live summary check karein.
